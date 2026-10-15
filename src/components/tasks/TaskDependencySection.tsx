import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Lock, Plus, ShieldQuestion, X } from "lucide-react";
import { api, type TaskDependencyGraph, type TaskDependencyItem } from "@/lib/api";
import { getStatusStyle } from "@/lib/calendarStatus";
import { resolveTaskPath } from "@/lib/taskExecutionRoutes";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";

export const TASK_DEPENDENCIES_KEY = "task-dependencies";

type Props = { taskId: string };

const personName = (u: { firstName?: string | null; lastName?: string | null }) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
const dueLabel = (deadline?: string | null) => (deadline ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(deadline)) : null);

function StatusChip({ status }: { status: string }) {
  const style = getStatusStyle(status);
  return <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>{style.label}</span>;
}

function Row({ item, canRemove, onRemove, removing, onOpen }: {
  item: TaskDependencyItem; canRemove: boolean; onRemove?: () => void; removing?: boolean; onOpen: (task: NonNullable<TaskDependencyItem["task"]>) => void;
}) {
  if (item.restricted || !item.task) {
    return (
      <li className="flex items-center gap-2 rounded-md border border-dashed p-2 text-sm text-muted-foreground" data-testid="dependency-restricted">
        <ShieldQuestion size={14} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">A task you can't view</span>
        <StatusChip status={item.status} />
        {canRemove && onRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Remove dependency" disabled={removing} onClick={onRemove}><X size={14} /></Button>
        )}
      </li>
    );
  }
  const task = item.task;
  const people = task.assignees.map(personName).filter(Boolean);
  const due = dueLabel(task.deadline);
  return (
    <li className="flex items-start gap-2 rounded-md border p-2 text-sm">
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => onOpen(task)} className="block max-w-full truncate text-left font-medium hover:text-primary hover:underline">{task.title}</button>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <StatusChip status={task.status} />
          {due && <span>Due {due}</span>}
          {people.length > 0 && <span className="truncate">{people.slice(0, 3).join(", ")}{people.length > 3 ? ` +${people.length - 3}` : ""}</span>}
          {item.cancelled && <span className="text-amber-700">Cancelled</span>}
        </div>
      </div>
      {canRemove && onRemove && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label={`Remove dependency on ${task.title}`} disabled={removing} onClick={onRemove}><X size={14} /></Button>
      )}
    </li>
  );
}

function AddDependency({ taskId, onAdd, adding }: { taskId: string; onAdd: (id: string) => void; adding: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { const t = setTimeout(() => setQuery(text.trim()), 250); return () => clearTimeout(t); }, [text]);

  // The server decides what is a valid choice (same workspace, viewable, no cycles, no parent/subtask).
  const candidates = useQuery({
    queryKey: ["task-dependency-candidates", taskId, query],
    enabled: open,
    queryFn: async () => (await api.getTaskDependencyCandidates(taskId, { q: query, limit: 20 })).data.tasks,
    staleTime: 0,
  });

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setText(""); setQuery(""); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" disabled={adding}><Plus size={14} /> Add dependency</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search tasks…" value={text} onValueChange={setText} aria-label="Search tasks to depend on" />
          <CommandList>
            {candidates.isLoading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Searching…</div>
            ) : (
              <>
                <CommandEmpty>No matching tasks.</CommandEmpty>
                <CommandGroup>
                  {(candidates.data ?? []).map((task) => (
                    <CommandItem key={task.id} value={task.id} onSelect={() => { setOpen(false); onAdd(task.id); }}>
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      <StatusChip status={task.status} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Task Details: advisory finish-to-start dependencies. All rules (permissions, cycles, visibility) are enforced by the backend. */
export default function TaskDependencySection({ taskId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { on, off } = useWebSocket();
  const key = useMemo(() => [TASK_DEPENDENCIES_KEY, taskId] as const, [taskId]);

  const { data: graph, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.getTaskDependencies(taskId)).data,
    staleTime: 0,
  });

  // Realtime: a predecessor/dependent changing status, or another user editing links, arrives as the existing task_updated.
  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: key });
    on("task_updated", refresh);
    return () => off("task_updated", refresh);
  }, [on, off, queryClient, key]);

  const apply = (next: TaskDependencyGraph) => {
    queryClient.setQueryData(key, next);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
  };
  const failure = (title: string) => (error: any) => toast({ title, description: error?.message || "Please try again.", variant: "destructive" });

  const add = useMutation({
    mutationFn: (dependsOnTaskId: string) => api.addTaskDependency(taskId, dependsOnTaskId),
    onSuccess: (res) => { apply(res.data); toast({ title: "Dependency added" }); },
    onError: failure("Couldn't add dependency"),
  });
  const remove = useMutation({
    mutationFn: (dependsOnTaskId: string) => api.removeTaskDependency(taskId, dependsOnTaskId),
    onSuccess: (res) => { apply(res.data); toast({ title: "Dependency removed" }); },
    onError: failure("Couldn't remove dependency"),
  });

  const open = (task: { id: string; teamId?: string | null; parentTaskId?: string | null }) =>
    navigate(resolveTaskPath({ id: task.id, teamId: task.teamId ?? null, parentTaskId: task.parentTaskId ?? null }, task.teamId ? "team" : "workbench"));

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading dependencies…</div>;
  if (isError || !graph) return <p role="alert" className="text-sm text-muted-foreground">Dependencies are unavailable right now.</p>;
  if (!graph.canManageDependencies && graph.dependsOn.length === 0 && graph.blocking.length === 0) return null;

  const unresolved = graph.unresolvedDependencyCount;
  return (
    <section aria-label="Dependencies" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 size={16} /> Dependencies</h3>
        {graph.canManageDependencies && <AddDependency taskId={taskId} onAdd={(id) => add.mutate(id)} adding={add.isPending} />}
      </div>

      {graph.isBlocked ? (
        <div role="status" data-testid="dependency-banner-blocked" className="flex items-center gap-2 rounded-md bg-red-50 p-2 text-sm text-red-800 ring-1 ring-red-200">
          <Lock size={14} aria-hidden="true" /> Blocked · waiting on {unresolved} unfinished {unresolved === 1 ? "task" : "tasks"}
        </div>
      ) : graph.dependsOnCount > 0 ? (
        <div role="status" data-testid="dependency-banner-unblocked" className="flex items-center gap-2 rounded-md bg-emerald-50 p-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 size={14} aria-hidden="true" /> Unblocked · all dependencies are finished
        </div>
      ) : null}

      {graph.hasCancelledDependency && (
        <div role="status" data-testid="dependency-cancelled-notice" className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>A dependency was cancelled.{graph.canManageDependencies ? " It no longer blocks this task; remove it if it is no longer relevant." : ""}</span>
        </div>
      )}

      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Depends on ({graph.dependsOnCount})</h4>
        {graph.dependsOn.length === 0 ? <p className="text-sm text-muted-foreground">Not waiting on any task.</p> : (
          <ul className="space-y-1.5">
            {graph.dependsOn.map((item) => (
              <Row
                key={item.linkId}
                item={item}
                canRemove={graph.canManageDependencies}
                removing={remove.isPending}
                onOpen={open}
                onRemove={() => { const id = item.task?.id ?? item.taskId; if (id) remove.mutate(id); }}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Blocking ({graph.blockingCount})</h4>
        {graph.blocking.length === 0 ? <p className="text-sm text-muted-foreground">No other task is waiting on this one.</p> : (
          <ul className="space-y-1.5">
            {graph.blocking.map((item) => <Row key={item.linkId} item={item} canRemove={false} onOpen={open} />)}
          </ul>
        )}
      </div>
    </section>
  );
}
