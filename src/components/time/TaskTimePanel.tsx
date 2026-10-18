import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Loader2, Pencil, Play, Square, Timer, Trash2 } from "lucide-react";
import { api, type TimeEntry } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ManualTimeEntryDialog from "@/components/time/ManualTimeEntryDialog";
import { elapsedSeconds, formatDuration } from "@/lib/timeTrackingUtils";
import { useWorkspaceGovernance } from "@/hooks/useWorkspaceGovernance";

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
function TimerClock({ entry }: { entry: TimeEntry }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  return <span className="font-mono tabular-nums">{formatDuration(elapsedSeconds(entry, now))}</span>;
}

export default function TaskTimePanel({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const { activeCompanyId, workspaceRole, user } = useAuth();
  const governance = useWorkspaceGovernance();
  const timeTrackingEnabled = governance.capabilities?.timeTrackingEnabled !== false;
  const { toast } = useToast();
  const client = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const canTrack = ["owner", "admin", "manager", "member"].includes(String(workspaceRole));
  const key = ["time-active", activeCompanyId];
  const timerQuery = useQuery({ queryKey: key, queryFn: async () => (await api.getActiveTimeTimer()).data.timer, enabled: !!activeCompanyId && canTrack, retry: false, refetchInterval: 60_000 });
  const entriesQuery = useQuery({ queryKey: ["time-entries", activeCompanyId, { taskId }], queryFn: async () => (await api.getTimeEntries({ taskId, limit: 20 })).data.entries, enabled: !!taskId && canTrack, retry: false });
  const summaryQuery = useQuery({ queryKey: ["time-summary", activeCompanyId, { taskId }], queryFn: async () => (await api.getTimeTrackingSummary({ taskId })).data, enabled: !!taskId && canTrack, retry: false });
  const refresh = () => { client.invalidateQueries({ queryKey: ["time-active", activeCompanyId] }); client.invalidateQueries({ queryKey: ["time-entries", activeCompanyId] }); client.invalidateQueries({ queryKey: ["time-summary", activeCompanyId] }); };
  const start = useMutation({ mutationFn: () => api.startTimeTimer({ taskId }), onSuccess: refresh, onError: (error: any) => toast({ title: "Timer not started", description: error?.message || "A timer may already be running.", variant: "destructive" }) });
  const stop = useMutation({ mutationFn: (entryId: string) => api.stopTimeTimer(entryId), onSuccess: refresh, onError: (error: any) => toast({ title: "Timer not stopped", description: error?.message || "Try again.", variant: "destructive" }) });
  const cancel = useMutation({ mutationFn: () => api.cancelTimeTimer(), onSuccess: () => { setConfirmCancel(false); refresh(); toast({ title: "Timer cancelled", description: "The unfinished entry was discarded." }); }, onError: (error: any) => toast({ title: "Could not cancel timer", description: error?.message || "Try again.", variant: "destructive" }) });
  const remove = useMutation({ mutationFn: (entryId: string) => api.deleteTimeEntry(entryId), onSuccess: () => { setDeleteEntryId(null); refresh(); toast({ title: "Time entry deleted", description: "The completed entry was removed." }); }, onError: (error: any) => toast({ title: "Could not delete entry", description: error?.message || "Try again.", variant: "destructive" }) });
  if (!canTrack) return null;
  const running = timerQuery.data;
  const taskTimer = running?.taskId === taskId;
  const summary = summaryQuery.data;
  return <section className="flex h-full min-h-0 flex-col bg-background">
    <header className="flex shrink-0 items-center justify-between border-b p-3"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Time</h3></div>{timeTrackingEnabled && <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>Log time</Button>}</header>
    {!timeTrackingEnabled && <p role="status" className="mx-3 mt-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">Time Tracking is disabled for this workspace. Existing entries remain available.</p>}
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <div className="rounded-xl border bg-card p-3">
        {taskTimer ? <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Timer running</p><p className="mt-1 text-xl font-semibold text-primary"><TimerClock entry={running!} /></p></div><div className="flex gap-2"><Button size="sm" onClick={() => stop.mutate(running!.id)} disabled={stop.isPending}>{stop.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Square className="mr-1.5 h-3.5 w-3.5" />}Stop</Button><Button size="sm" variant="ghost" onClick={() => setConfirmCancel(true)} aria-label="Cancel running timer"><Trash2 className="h-4 w-4" /></Button></div></div>
          : running ? <div className="space-y-2"><p className="text-sm">A timer is already running on another Task.</p><div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-muted-foreground">{running.taskTitleSnapshot}</span><Link to={`/task-details/${running.taskId}`} className="text-xs font-medium text-primary hover:underline">Open Task</Link></div></div>
          : <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Track time on this Task</p><p className="mt-0.5 text-xs text-muted-foreground">Only one timer can run at a time per workspace.</p></div>{timeTrackingEnabled && <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending || timerQuery.isLoading}>{start.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}Start</Button>}</div>}
      </div>
      <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">Tracked</p><p className="mt-1 font-semibold">{formatDuration(summary?.totalSeconds || 0)}</p></div><div className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">Billable</p><p className="mt-1 font-semibold">{formatDuration(summary?.billableSeconds || 0)}</p></div></div>
      <div><div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent entries</h4>{(summary?.totalSeconds || 0) > 0 && <span className="text-[11px] text-muted-foreground">{entriesQuery.data?.length || 0} shown</span>}</div>
        {entriesQuery.isLoading ? <div className="space-y-2">{[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
          : entriesQuery.isError ? <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Time entries could not be loaded.</p>
          : !entriesQuery.data?.length ? <div className="rounded-lg border border-dashed p-5 text-center"><Clock3 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /><p className="text-sm font-medium">No time logged yet</p><p className="mt-1 text-xs text-muted-foreground">Start a timer or add a manual entry.</p></div>
          : <div className="divide-y rounded-lg border">{entriesQuery.data.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{entry.userNameSnapshot}</p><p className="mt-0.5 text-xs text-muted-foreground">{dateLabel(entry.entryDate)}{entry.note ? ` · ${entry.note}` : ""}</p></div><div className="flex shrink-0 items-start gap-2"><div className="text-right"><p className="text-sm font-semibold">{formatDuration(entry.durationSeconds)}</p>{entry.billable && <Badge variant="secondary" className="mt-1 px-1.5 py-0 text-[10px]">Billable</Badge>}</div>{entry.userId === user?.id && entry.endedAt && <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit time entry" onClick={() => setEditingEntry(entry)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Delete time entry" onClick={() => setDeleteEntryId(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>}</div></div>)}</div>}
      </div>
    </div>
    {timeTrackingEnabled && <ManualTimeEntryDialog taskId={taskId} taskTitle={taskTitle} open={logOpen || !!editingEntry} entry={editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null); setLogOpen(open); }} onSaved={refresh} />}
    {deleteEntryId && <div role="dialog" aria-modal="true" aria-labelledby="delete-time-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl"><h2 id="delete-time-title" className="font-semibold">Delete this time entry?</h2><p className="mt-2 text-sm text-muted-foreground">This removes the completed entry from time reports.</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteEntryId(null)}>Keep entry</Button><Button variant="destructive" onClick={() => remove.mutate(deleteEntryId)} disabled={remove.isPending}>Delete entry</Button></div></div></div>}
    {confirmCancel && <div role="dialog" aria-modal="true" aria-labelledby="cancel-timer-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl"><h2 id="cancel-timer-title" className="font-semibold">Discard this timer?</h2><p className="mt-2 text-sm text-muted-foreground">The unfinished time entry will be deleted and will not appear in reports.</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmCancel(false)}>Keep timer</Button><Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>Discard timer</Button></div></div></div>}
  </section>;
}
