import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Loader2, Pause, Play, Repeat, Square } from "lucide-react";
import { api, type TaskRecurrenceDetails, type TaskRecurrenceInput, type TaskRecurrenceResponse } from "@/lib/api";
import {
  defaultFormState, formStateFromRecurrence, getBrowserTimeZone, INTERVAL_UNIT, PRESET_LABELS, PRESETS_WITH_INTERVAL,
  toRecurrencePayload, WEEKDAY_NAMES, type EndsMode, type RecurrenceFormState, type RepeatPreset,
} from "@/lib/recurrenceForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";

export const TASK_RECURRENCE_KEY = "task-recurrence";

const dateTime = (iso?: string | null) => (iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—");
const dateOnly = (iso?: string | null) => (iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso)) : "—");

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  paused: "bg-amber-50 text-amber-900 ring-amber-200",
  stopped: "bg-slate-100 text-slate-700 ring-slate-200",
  completed: "bg-blue-50 text-blue-800 ring-blue-200",
};
const STATUS_LABEL: Record<string, string> = { active: "Active", paused: "Paused", stopped: "Stopped", completed: "Completed" };
const PAUSE_REASON: Record<string, string> = {
  MANUAL: "Paused by a manager.",
  CREATOR_NOT_IN_WORKSPACE: "Paused automatically: the person who set this series up is no longer in the workspace.",
  CREATOR_INACTIVE: "Paused automatically: the person who set this series up is no longer active.",
  CREATOR_NOT_PERMITTED: "Paused automatically: the person who set this series up can no longer create tasks.",
  CREATOR_UNAVAILABLE: "Paused automatically: the person who set this series up no longer exists.",
  PROJECT_UNAVAILABLE: "Paused automatically: the project is no longer available.",
  TEAM_UNAVAILABLE: "Paused automatically: the team is no longer available.",
  TEAM_NOT_PERMITTED: "Paused automatically: the series creator can no longer assign tasks to the team.",
  WORKSPACE_UNAVAILABLE: "Paused automatically: the workspace is no longer available.",
};
const OWNERSHIP_REASONS = ["CREATOR_NOT_IN_WORKSPACE", "CREATOR_INACTIVE", "CREATOR_NOT_PERMITTED", "CREATOR_UNAVAILABLE"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex gap-3 text-sm"><dt className="w-28 shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 flex-1">{children}</dd></div>;
}

/* ------------------------------------------------------------------ editor */

function RecurrenceEditor({ open, onOpenChange, taskId, taskDeadline, existing, onSaved }: {
  open: boolean; onOpenChange: (open: boolean) => void; taskId: string; taskDeadline?: string | null; existing: TaskRecurrenceDetails | null; onSaved: (res: TaskRecurrenceResponse) => void;
}) {
  const { toast } = useToast();
  const mode = existing ? "edit" : "create";
  const needsStart = !existing && !taskDeadline;
  const timezone = existing?.timezone ?? getBrowserTimeZone();
  const [state, setState] = useState<RecurrenceFormState>(() => (existing ? formStateFromRecurrence(existing) : defaultFormState(taskDeadline)));
  useEffect(() => { if (open) setState(existing ? formStateFromRecurrence(existing) : defaultFormState(taskDeadline)); }, [open, existing, taskDeadline]);

  const payload = useMemo(() => toRecurrencePayload(state, { mode, timezone, needsStart }), [state, mode, timezone, needsStart]);
  const [debounced, setDebounced] = useState<TaskRecurrenceInput | null>(payload);
  useEffect(() => { const t = setTimeout(() => setDebounced(payload), 300); return () => clearTimeout(t); }, [payload]);

  // The server's schedule engine is the only calculator: the preview here is exactly what generation will use.
  const preview = useQuery({
    queryKey: ["task-recurrence-preview", taskId, JSON.stringify(debounced)],
    enabled: open && debounced !== null,
    retry: false,
    queryFn: async () => (await api.previewTaskRecurrence(taskId, mode === "create" ? debounced! : { ...debounced!, timezone })).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!payload) throw new Error("Complete the form first.");
      return mode === "create" ? api.createTaskRecurrence(taskId, payload) : api.updateTaskRecurrence(taskId, payload);
    },
    onSuccess: (res) => { toast({ title: mode === "create" ? "Task is now recurring" : "Recurrence updated" }); onSaved(res.data); onOpenChange(false); },
    onError: (error: any) => toast({ title: "Couldn't save recurrence", description: error?.message || "Please try again.", variant: "destructive" }),
  });

  const set = (patch: Partial<RecurrenceFormState>) => setState((prev) => ({ ...prev, ...patch }));
  const preset = state.preset;
  const showMonthDay = preset === "monthly" || preset === "quarterly" || preset === "yearly";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Make recurring" : "Edit recurrence"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "This task becomes occurrence #1. Later occurrences are created as ordinary tasks."
              : "Changes apply to future occurrences that haven't been created yet. Existing tasks are not changed."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {needsStart && (
            <label className="block font-medium">
              Starts
              <input type="datetime-local" aria-label="Series start" value={state.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2" />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">This task has no due date yet. The start you choose becomes its due date.</span>
            </label>
          )}

          <label className="block font-medium">
            Repeat
            <select aria-label="Repeat" value={preset} onChange={(e) => set({ preset: e.target.value as RepeatPreset })} className="mt-1 w-full rounded-md border px-3 py-2">
              {(Object.keys(PRESET_LABELS) as RepeatPreset[]).map((p) => <option key={p} value={p}>{PRESET_LABELS[p]}</option>)}
            </select>
          </label>

          {PRESETS_WITH_INTERVAL.includes(preset) && (
            <label className="flex items-center gap-2 font-medium">
              Every
              <input type="number" min={1} max={99} aria-label="Every" value={state.interval} onChange={(e) => set({ interval: Number(e.target.value) })} className="w-20 rounded-md border px-2 py-1.5" />
              <span className="font-normal text-muted-foreground">{INTERVAL_UNIT[preset]}</span>
            </label>
          )}

          {preset === "weekly" && (
            <fieldset>
              <legend className="font-medium">On</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {WEEKDAY_NAMES.map((name, day) => {
                  const on = state.weekdays.includes(day);
                  return (
                    <button key={name} type="button" aria-pressed={on} aria-label={name}
                      onClick={() => set({ weekdays: on ? state.weekdays.filter((d) => d !== day) : [...state.weekdays, day] })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-indigo-600 bg-indigo-600 text-white" : "bg-white hover:bg-slate-50"}`}>{name}</button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {showMonthDay && (
            <label className="block font-medium">
              On day
              <select aria-label="Day of month" value={state.monthDay} onChange={(e) => set({ monthDay: Number(e.target.value) })} className="mt-1 w-full rounded-md border px-3 py-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}{d >= 29 ? " (last day in shorter months)" : ""}</option>)}
                <option value={-1}>Last day of the month</option>
              </select>
            </label>
          )}

          {mode === "edit" && (
            <label className="block font-medium">
              Time
              <input type="time" aria-label="Time" value={state.localTime} onChange={(e) => set({ localTime: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2" />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Wall-clock time in {timezone}; it stays the same across daylight-saving changes.</span>
            </label>
          )}

          <fieldset>
            <legend className="font-medium">Ends</legend>
            <div className="mt-1 space-y-2">
              {(["never", "on", "after"] as EndsMode[]).map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input type="radio" name="ends" checked={state.endsMode === m} onChange={() => set({ endsMode: m })} aria-label={m === "never" ? "Never" : m === "on" ? "On date" : "After"} />
                  {m === "never" && "Never"}
                  {m === "on" && <>On <input type="date" aria-label="End date" value={state.endsOn} disabled={state.endsMode !== "on"} onChange={(e) => set({ endsOn: e.target.value })} className="rounded-md border px-2 py-1" /></>}
                  {m === "after" && <>After <input type="number" min={1} aria-label="Total occurrences" value={state.maxOccurrences} disabled={state.endsMode !== "after"} onChange={(e) => set({ maxOccurrences: Number(e.target.value) })} className="w-20 rounded-md border px-2 py-1" /> occurrences in total</>}
                </label>
              ))}
              {state.endsMode === "after" && <p className="text-xs text-muted-foreground">Counts this task as #1{existing ? " and every occurrence already created or skipped" : ""}.</p>}
            </div>
          </fieldset>

          <div className="rounded-md bg-slate-50 p-3" aria-live="polite">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            {!payload ? <p className="mt-1 text-muted-foreground">Complete the form to see the schedule.</p>
              : preview.isLoading ? <p className="mt-1 flex items-center gap-2 text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Calculating…</p>
              : preview.isError ? <p role="alert" className="mt-1 text-red-700">{(preview.error as Error)?.message || "Couldn't calculate the schedule."}</p>
              : preview.data ? (
                <>
                  <p data-testid="preview-summary" className="mt-1 font-medium">{preview.data.summary}</p>
                  <ol data-testid="preview-list" className="mt-1 list-decimal space-y-0.5 pl-5">{preview.data.occurrences.map((iso) => <li key={iso}>{dateTime(iso)}</li>)}</ol>
                  {preview.data.occurrences.length === 0 && <p className="mt-1 text-muted-foreground">No further occurrences.</p>}
                </>
              ) : null}
            <p className="mt-2 text-xs text-muted-foreground">Timezone: {timezone}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!payload || save.isPending}>{save.isPending ? "Saving…" : mode === "create" ? "Make recurring" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- section */

type Props = { taskId: string; taskDeadline?: string | null };

/** Task Details: manage the recurring series this task belongs to. All rules (permissions, schedule, limits) are the backend's. */
export default function TaskRecurrenceSection({ taskId, taskDeadline }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { on, off } = useWebSocket();
  const key = useMemo(() => [TASK_RECURRENCE_KEY, taskId] as const, [taskId]);
  const [editing, setEditing] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [takeOwnership, setTakeOwnership] = useState(false);

  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: async () => (await api.getTaskRecurrence(taskId)).data, staleTime: 0 });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: key });
    on("task_updated", refresh);
    return () => off("task_updated", refresh);
  }, [on, off, queryClient, key]);

  const apply = (next: TaskRecurrenceResponse) => {
    queryClient.setQueryData(key, next);
    for (const k of ["tasks", "board-tasks", "calendar-events", "task-details"]) queryClient.invalidateQueries({ queryKey: [k] });
  };
  const useAction = (call: () => Promise<{ data: TaskRecurrenceResponse }>, success: string, failure: string) =>
    useMutation({ mutationFn: call, onSuccess: (res) => { apply(res.data); toast({ title: success }); }, onError: (e: any) => toast({ title: failure, description: e?.message || "Please try again.", variant: "destructive" }) });
  const pause = useAction(() => api.pauseTaskRecurrence(taskId), "Recurrence paused", "Couldn't pause");
  const resume = useAction(() => api.resumeTaskRecurrence(taskId, { takeOwnership }), "Recurrence resumed", "Couldn't resume");
  const stop = useAction(() => api.stopTaskRecurrence(taskId), "Recurrence stopped", "Couldn't stop");
  const applyDetails = useAction(() => api.useTaskDetailsForFutureOccurrences(taskId), "Future occurrences will use this task's details", "Couldn't update the template");

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading recurrence…</div>;
  if (isError || !data) return <p role="alert" className="text-sm text-muted-foreground">Recurrence is unavailable right now.</p>;

  const { recurrence: rec, occurrence, canManageRecurrence: canManage } = data;

  if (!rec) {
    if (!canManage) return null;
    return (
      <section aria-label="Recurring" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Repeat size={16} /> Recurring</h3>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Make recurring</Button>
        </div>
        <p className="text-sm text-muted-foreground">Not repeating. Make this task recurring to create ordinary tasks on a schedule.</p>
        <RecurrenceEditor open={editing} onOpenChange={setEditing} taskId={taskId} taskDeadline={taskDeadline} existing={null} onSaved={apply} />
      </section>
    );
  }

  const finished = rec.status === "stopped" || rec.status === "completed";
  const weekdays = rec.byWeekday?.map((d) => WEEKDAY_NAMES[d]).join(", ");
  const ends = rec.maxOccurrences != null ? `After ${rec.maxOccurrences} occurrences (including the first)` : rec.endsAt ? `On ${dateOnly(rec.endsAt)}` : "Never";
  const ownershipPause = rec.status === "paused" && rec.pausedReason && OWNERSHIP_REASONS.includes(rec.pausedReason);

  return (
    <section aria-label="Recurring" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Repeat size={16} /> Recurring</h3>
        <span data-testid="recurrence-status" className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLE[rec.status]}`}>{STATUS_LABEL[rec.status]}</span>
      </div>

      <p data-testid="recurrence-summary" className="text-sm font-medium">{rec.summary}</p>
      {occurrence && (
        <p data-testid="recurrence-occurrence" className="text-xs text-muted-foreground">
          {occurrence.isSource ? "This is the original task: occurrence #1 of the series." : `Occurrence #${occurrence.sequence} of this series.`}
        </p>
      )}

      {rec.status === "paused" && rec.pausedReason && (
        <div role="status" data-testid="recurrence-paused-notice" className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{PAUSE_REASON[rec.pausedReason] || "Paused."}{rec.lastRunNote ? ` ${rec.lastRunNote}` : ""}</span>
        </div>
      )}
      {rec.status === "stopped" && <p className="text-xs text-muted-foreground">This series was stopped. Existing tasks remain; no more will be created.</p>}
      {rec.status === "completed" && <p className="text-xs text-muted-foreground">This series has finished. All of its occurrences have been created.</p>}

      <dl className="space-y-1.5">
        <Row label="Repeat">{PRESET_LABELS[formStateFromRecurrence(rec).preset]}</Row>
        <Row label="Every">{rec.interval} {rec.frequency === "daily" ? "day(s)" : rec.frequency === "weekly" ? "week(s)" : rec.frequency === "monthly" ? "month(s)" : "year(s)"}</Row>
        {weekdays && <Row label="On">{weekdays}</Row>}
        {rec.byMonthDay != null && <Row label="On day">{rec.byMonthDay === -1 ? "Last day of the month" : rec.byMonthDay}</Row>}
        <Row label="Starts">{dateTime(rec.startsAt)}</Row>
        <Row label="Time">{rec.localTime} ({rec.timezone})</Row>
        <Row label="Ends">{ends}</Row>
        <Row label="Next occurrence"><span data-testid="recurrence-next">{rec.nextOccurrenceAt && !finished ? dateTime(rec.nextOccurrenceAt) : "—"}</span></Row>
      </dl>

      {rec.upcoming.length > 0 && !finished && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Next {rec.upcoming.length}</h4>
          <ol data-testid="recurrence-upcoming" className="list-decimal space-y-0.5 pl-5 text-sm">{rec.upcoming.map((iso) => <li key={iso}>{dateTime(iso)}</li>)}</ol>
        </div>
      )}

      {canManage && !finished && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><CalendarClock size={14} className="mr-1" /> Edit</Button>
          {rec.status === "active" && <Button variant="outline" size="sm" onClick={() => pause.mutate()} disabled={pause.isPending}><Pause size={14} className="mr-1" /> Pause</Button>}
          {rec.status === "paused" && <Button variant="outline" size="sm" onClick={() => resume.mutate()} disabled={resume.isPending}><Play size={14} className="mr-1" /> Resume</Button>}
          {!confirmStop
            ? <Button variant="outline" size="sm" onClick={() => setConfirmStop(true)}><Square size={14} className="mr-1" /> Stop recurrence</Button>
            : (
              <span className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800">
                Stop for good? Existing tasks stay.
                <Button size="sm" variant="destructive" onClick={() => { setConfirmStop(false); stop.mutate(); }}>Confirm stop</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmStop(false)}>Keep</Button>
              </span>
            )}
          <Button variant="ghost" size="sm" onClick={() => applyDetails.mutate()} disabled={applyDetails.isPending}>Use this task's details for future occurrences</Button>
        </div>
      )}
      {canManage && ownershipPause && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={takeOwnership} onChange={(e) => setTakeOwnership(e.target.checked)} aria-label="Take over this series when resuming" />
          Take over this series when resuming (future tasks will be created as you)
        </label>
      )}

      <RecurrenceEditor open={editing} onOpenChange={setEditing} taskId={taskId} taskDeadline={taskDeadline} existing={rec} onSaved={apply} />
    </section>
  );
}
