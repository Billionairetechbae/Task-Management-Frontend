import { useEffect, useMemo, useState } from "react";
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

const BOARD_KEY = "board-tasks";
const STATUS_LABELS = Object.fromEntries(TASK_STATUSES.map((status) => [status, getStatusStyle(status).label])) as Record<TaskStatus, string>;

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
      queryClient.setQueryData(queryKey, (old: any) => old ? { ...old, data: { ...old.data, tasks: old.data.tasks.map((task: Task) => task.id === id ? { ...task, status } : task) } } : old);
      return { previous };
    },
    onError: (error: any, _values, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      toast.error("Couldn’t move task", { description: error?.message || "Your permissions may have changed." });
    },
    onSuccess: () => toast.success("Task status updated"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BOARD_KEY] }),
  });

  const columns = useMemo(() => Object.fromEntries(TASK_STATUSES.map((status) => [status, tasks.filter((task) => task.status === status).sort((a, b) => {
    const overdueA = isTaskOverdue(a) ? 1 : 0; const overdueB = isTaskOverdue(b) ? 1 : 0;
    if (overdueA !== overdueB) return overdueB - overdueA;
    return String(a.deadline || "9999").localeCompare(String(b.deadline || "9999")) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  })])), [tasks]);

  return <DashboardLayout hidePadding fullWidth>
    <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-slate-50">
      <header className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3 sm:px-6">
        <WorkspaceSwitcher />
        <div className="min-w-0 flex-1"><h1 className="text-xl font-semibold">Board</h1><p className="text-sm text-muted-foreground">Active workspace tasks by status</p></div>
        <input aria-label="Search board tasks" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search tasks" className="h-9 w-full rounded-md border px-3 text-sm sm:w-52" />
        <select aria-label="Filter board by project" value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })} className="h-9 rounded-md border px-2 text-sm"><option value="">All projects</option>{projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select aria-label="Filter board by team" value={filters.teamId} onChange={(e) => setFilters({ ...filters, teamId: e.target.value })} className="h-9 rounded-md border px-2 text-sm"><option value="">All teams</option>{teams.map((team: any) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
      </header>
      {isError && <p role="alert" className="m-4 text-sm text-destructive">Could not load board tasks. Please try again.</p>}
      <section aria-label="Task board" className="flex flex-1 gap-3 overflow-x-auto p-4 sm:p-6">
        {TASK_STATUSES.map((status) => <section key={status} aria-label={`${STATUS_LABELS[status]} column`} className="flex w-[17rem] shrink-0 flex-col rounded-xl border bg-slate-100/70 p-2 sm:w-72">
          <header className="flex items-center justify-between px-2 pb-2"><span className="font-medium">{STATUS_LABELS[status]}</span><span className="rounded-full bg-white px-2 py-0.5 text-xs text-muted-foreground">{columns[status].length}</span></header>
          <div className="space-y-2">{isLoading ? <p className="p-2 text-sm text-muted-foreground">Loading…</p> : columns[status].length === 0 ? <p className="rounded-lg border border-dashed bg-white/70 p-3 text-sm text-muted-foreground">No tasks</p> : columns[status].map((task) => {
            const overdue = isTaskOverdue(task); const canMove = userCanMove(task, user?.id, workspaceRole);
            return <article key={task.id} className="rounded-lg border bg-white p-3 shadow-sm">
              <button onClick={() => navigate(resolveTaskPath(task, task.teamId ? "team" : "workbench"))} className="w-full text-left font-medium hover:underline">{task.title}</button>
              <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground"><span className="rounded bg-slate-100 px-1.5 py-0.5 capitalize">{task.priority}</span>{task.deadline && <span className={overdue ? "flex items-center gap-1 font-medium text-red-700" : "flex items-center gap-1"}>{overdue ? <AlertTriangle size={12} /> : <CalendarDays size={12} />}{overdue ? "Overdue" : dueLabel(task.deadline)}</span>}</div>
              {((task as any).project || task.team) && <div className="mt-2 space-y-1 text-xs text-muted-foreground">{(task as any).project && <div className="flex items-center gap-1"><FolderKanban size={12} />{(task as any).project.name}</div>}{task.team && <div className="flex items-center gap-1"><Users size={12} />{task.team.name}</div>}</div>}
              {Number(task.subtaskCount || 0) > 0 && <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CheckSquare size={12} />{task.subtaskCount} subtask{task.subtaskCount === 1 ? "" : "s"}</div>}
              {(task.assignees?.length || task.assignee) && <p className="mt-2 truncate text-xs text-muted-foreground">{(task.assignees || [task.assignee]).filter(Boolean).slice(0, 3).map((assignee: any) => `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim()).join(", ")}</p>}
              {canMove && <label className="mt-3 flex items-center gap-1 text-xs font-medium">Move to <ChevronDown size={13} /><select aria-label={`Move ${task.title} to`} value={task.status || "pending"} disabled={move.isPending} onChange={(e) => { if (task.id && e.target.value !== task.status) move.mutate({ id: task.id, status: e.target.value as TaskStatus }); }} className="min-w-0 flex-1 rounded border bg-white p-1 text-xs">{TASK_STATUSES.map((next) => <option key={next} value={next}>{STATUS_LABELS[next]}</option>)}</select></label>}
            </article>;
          })}</div>
        </section>)}
      </section>
    </main>
  </DashboardLayout>;
}
