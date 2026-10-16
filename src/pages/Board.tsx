import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, CheckSquare, ChevronDown, FolderKanban, Users } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { api, type Task, type TaskStatus } from "@/lib/api";
import { resolveTaskPath } from "@/lib/taskExecutionRoutes";
import { getStatusStyle, isTaskOverdue, TASK_STATUSES } from "@/lib/calendarStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import BlockedBadge from "@/components/tasks/BlockedBadge";
import RepeatBadge from "@/components/tasks/RepeatBadge";
import { dependencyWarningMessage } from "@/lib/taskDependencies";

const BOARD_KEY = "board-tasks";
const STATUS_LABELS = Object.fromEntries(TASK_STATUSES.map((status) => [status, getStatusStyle(status).label])) as Record<TaskStatus, string>;

// Literal class names so Tailwind can see them. Subtle tints: the accent identifies the lane, text labels still carry the meaning.
const STATUS_ACCENT: Record<TaskStatus, { bar: string; panel: string; badge: string; dot: string }> = {
  pending: { bar: "border-t-slate-400", panel: "bg-slate-50/80", badge: "bg-slate-200 text-slate-700", dot: "bg-slate-400" },
  in_progress: { bar: "border-t-blue-500", panel: "bg-blue-50/60", badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  in_review: { bar: "border-t-amber-500", panel: "bg-amber-50/60", badge: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  completed: { bar: "border-t-emerald-500", panel: "bg-emerald-50/60", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  delayed: { bar: "border-t-red-500", panel: "bg-red-50/50", badge: "bg-red-100 text-red-800", dot: "bg-red-500" },
  cancelled: { bar: "border-t-gray-400", panel: "bg-gray-50/80", badge: "bg-gray-200 text-gray-600", dot: "bg-gray-400" },
};
const LEAVE_MS = 160;
const SETTLE_MS = 700;
const prefersReducedMotion = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

type Filters = { projectId: string; teamId: string; search: string };

function userCanMove(task: Task, userId?: string | null, workspaceRole?: string | null) {
  if (["owner", "admin", "manager", "platform_admin"].includes(workspaceRole || "")) return true;
  if (!userId) return false;
  if (String(task.creator?.id || "") === String(userId) || String(task.assigneeId || "") === String(userId)) return true;
  if ((task.assignees || []).some((assignee: any) => String(assignee.id) === String(userId))) return true;
  const leadUserId = (task.team as any)?.leadMember?.userId || (task.team as any)?.leadMember?.user?.id;
  return Boolean(leadUserId && String(leadUserId) === String(userId));
}

function dueLabel(deadline?: string | null) {
  if (!deadline) return "No due date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(deadline));
}

export default function Board() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, activeCompanyId, workspaceRole } = useAuth();
  const ws = useWebSocket();
  const [filters, setFilters] = useState<Filters>({ projectId: "", teamId: "", search: "" });
  const queryKey = [BOARD_KEY, activeCompanyId, filters] as const;
  // Purely visual: which card is animating out of its lane / settling into a lane. Task data stays in react-query.
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [settledId, setSettledId] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  const flash = useCallback((id: string) => { setSettledId(id); later(() => setSettledId((cur) => (cur === id ? null : cur)), SETTLE_MS); }, [later]);

  const { data: result, isLoading, isError } = useQuery({
    queryKey,
    enabled: Boolean(activeCompanyId),
    queryFn: () => api.getAllTasksCrossWorkspace({ scope: "workspace", limit: 100, search: filters.search || undefined, projectId: filters.projectId || undefined, teamId: filters.teamId || undefined }),
    staleTime: 0,
  });
  const { data: projectResult } = useQuery({ queryKey: ["board-projects", activeCompanyId], enabled: Boolean(activeCompanyId), queryFn: () => api.getProjects(), staleTime: 60_000 });
  const { data: teamResult } = useQuery({ queryKey: ["board-teams", activeCompanyId], enabled: Boolean(activeCompanyId), queryFn: () => api.listTeams(), staleTime: 60_000 });
  const tasks = result?.data?.tasks || [];
  const projects = (projectResult as any)?.data?.projects || (projectResult as any)?.data?.items || [];
  const teams = (teamResult as any)?.data?.teams || [];

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: [BOARD_KEY] });
    ws.on("task_updated", refresh); ws.on("task_created", refresh); ws.on("task_deleted", refresh);
    return () => { ws.off("task_updated", refresh); ws.off("task_created", refresh); ws.off("task_deleted", refresh); };
  }, [queryClient, ws]);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => api.updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: [BOARD_KEY] });
      const previous = queryClient.getQueryData(queryKey);
      setLeavingId(null);
      flash(id);
      queryClient.setQueryData(queryKey, (old: any) => old ? { ...old, data: { ...old.data, tasks: old.data.tasks.map((task: Task) => task.id === id ? { ...task, status } : task) } } : old);
      return { previous };
    },
    onError: (error: any, values, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      flash(values.id);
      toast.error("Couldn’t move task", { description: error?.message || "Your permissions may have changed." });
    },
    // Advisory only: the move already succeeded; the server tells us when dependencies are still unfinished.
    onSuccess: (res) => {
      const warning = dependencyWarningMessage(res?.warnings);
      if (warning) toast.warning(warning); else toast.success("Task status updated");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BOARD_KEY] }),
  });

  const startMove = (task: Task, status: TaskStatus) => {
    if (!task.id || status === task.status) return;
    const id = task.id;
    if (prefersReducedMotion()) { move.mutate({ id, status }); return; }
    // Let the card fade out of its lane first; the optimistic update then reflows it into the new lane.
    setLeavingId(id);
    later(() => move.mutate({ id, status }), LEAVE_MS);
  };

  const columns = useMemo(() => Object.fromEntries(TASK_STATUSES.map((status) => [status, tasks.filter((task) => task.status === status).sort((a, b) => {
    const overdueA = isTaskOverdue(a) ? 1 : 0; const overdueB = isTaskOverdue(b) ? 1 : 0;
    if (overdueA !== overdueB) return overdueB - overdueA;
    return String(a.deadline || "9999").localeCompare(String(b.deadline || "9999")) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  })])), [tasks]);

  return <DashboardLayout hidePadding fullWidth>
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-slate-100/70">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-white px-4 py-3 shadow-sm sm:px-6">
        <WorkspaceSwitcher />
        <div className="min-w-0 flex-1"><h1 className="text-xl font-semibold">Board</h1><p className="text-sm text-muted-foreground">Active workspace tasks by status</p></div>
        <input aria-label="Search board tasks" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search tasks" className="h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-52" />
        <select aria-label="Filter board by project" value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })} className="h-9 rounded-md border px-2 text-sm"><option value="">All projects</option>{projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select aria-label="Filter board by team" value={filters.teamId} onChange={(e) => setFilters({ ...filters, teamId: e.target.value })} className="h-9 rounded-md border px-2 text-sm"><option value="">All teams</option>{teams.map((team: any) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
      </header>
      {isError && <p role="alert" className="m-4 text-sm text-destructive">Could not load board tasks. Please try again.</p>}
      {/* Mobile: swipeable lanes. Tablet: 2 columns (grid scrolls). Desktop (xl): fixed 3 x 2 grid, only the lanes scroll. */}
      <section
        aria-label="Task board"
        data-testid="board-grid"
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:p-4 md:grid md:snap-none md:grid-cols-2 md:content-start md:overflow-y-auto md:overflow-x-hidden xl:grid-cols-3 xl:grid-rows-2 xl:overflow-hidden"
      >
        {TASK_STATUSES.map((status) => {
          const accent = STATUS_ACCENT[status];
          return <section
            key={status}
            aria-label={`${STATUS_LABELS[status]} column`}
            data-testid={`board-panel-${status}`}
            className={`flex h-full w-[86vw] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-t-4 shadow-sm md:h-[26rem] md:w-auto md:shrink xl:h-auto xl:min-h-0 ${accent.bar} ${accent.panel}`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-black/5 bg-white/70 px-3 py-2.5 backdrop-blur">
              <span className="flex items-center gap-2 font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} aria-hidden="true" />{STATUS_LABELS[status]}</span>
              <span aria-label={`${columns[status].length} tasks`} className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${accent.badge}`}>{columns[status].length}</span>
            </header>
            <div data-testid={`board-scroll-${status}`} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-2.5">
              {isLoading ? <p className="p-2 text-sm text-muted-foreground">Loading…</p> : columns[status].length === 0 ? <p className="rounded-lg border border-dashed bg-white/60 p-4 text-center text-sm text-muted-foreground">No tasks</p> : columns[status].map((task) => {
                const overdue = isTaskOverdue(task); const canMove = userCanMove(task, user?.id, workspaceRole);
                const leaving = leavingId === task.id; const settled = settledId === task.id;
                const people = ((task.assignees && task.assignees.length ? task.assignees : [task.assignee]).filter(Boolean) as any[]).map((a) => `${a.firstName || ""} ${a.lastName || ""}`.trim()).filter(Boolean);
                return <article
                  key={task.id}
                  data-testid="board-card"
                  data-state={leaving ? "leaving" : settled ? "settled" : "idle"}
                  className={`group rounded-lg border bg-white p-3 shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/30 ${overdue ? "border-l-4 border-l-red-500 bg-red-50/40" : ""} ${leaving ? "scale-95 opacity-0" : ""} ${settled ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-left-3 ring-2 ring-blue-400/50" : ""}`}
                >
                  <button onClick={() => navigate(resolveTaskPath(task, task.teamId ? "team" : "workbench"))} className="w-full text-left text-sm font-semibold leading-snug hover:text-blue-700 hover:underline focus:outline-none focus-visible:underline">{task.title}</button>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium capitalize text-slate-700">{task.priority}</span>
                    <BlockedBadge task={task} />
                    <RepeatBadge task={task} />
                    {task.deadline && (overdue
                      ? <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700"><AlertTriangle size={12} />Overdue · {dueLabel(task.deadline)}</span>
                      : <span className="flex items-center gap-1 text-muted-foreground"><CalendarDays size={12} />{dueLabel(task.deadline)}</span>)}
                  </div>
                  {((task as any).project || task.team || Number(task.subtaskCount || 0) > 0) && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {(task as any).project && <span className="flex min-w-0 items-center gap-1"><FolderKanban size={12} className="shrink-0" /><span className="truncate">{(task as any).project.name}</span></span>}
                    {task.team && <span className="flex min-w-0 items-center gap-1"><Users size={12} className="shrink-0" /><span className="truncate">{task.team.name}</span></span>}
                    {Number(task.subtaskCount || 0) > 0 && <span className="flex items-center gap-1"><CheckSquare size={12} />{task.subtaskCount} subtask{task.subtaskCount === 1 ? "" : "s"}</span>}
                  </div>}
                  {Array.isArray((task as any).customFieldChips) && (task as any).customFieldChips.length > 0 && <div className="mt-2 flex flex-wrap gap-1" aria-label="Custom fields">{(task as any).customFieldChips.slice(0, 3).map((chip: any) => <span key={chip.fieldId} title={chip.name} className="max-w-full truncate rounded border bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700">{chip.name}: {Array.isArray(chip.display) ? chip.display.join(", ") : String(chip.display)}</span>)}</div>}
                  {people.length > 0 && <p className="mt-2 truncate text-xs text-muted-foreground">{people.slice(0, 3).join(", ")}{people.length > 3 ? ` +${people.length - 3}` : ""}</p>}
                  {canMove && <label className="mt-3 flex items-center gap-1 border-t pt-2 text-xs font-medium text-slate-600">Move to <ChevronDown size={13} /><select aria-label={`Move ${task.title} to`} value={task.status || "pending"} disabled={move.isPending || leaving} onChange={(e) => startMove(task, e.target.value as TaskStatus)} className="min-w-0 flex-1 rounded border bg-white p-1 text-xs hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30">{TASK_STATUSES.map((next) => <option key={next} value={next}>{STATUS_LABELS[next]}</option>)}</select></label>}
                </article>;
              })}
            </div>
          </section>;
        })}
      </section>
    </main>
  </DashboardLayout>;
}
