import { addMinutes, endOfDay, isBefore } from "date-fns";
import { taskWorkbenchPath, teamSubtaskPath, teamTaskPath } from "@/lib/taskExecutionRoutes";

/** Mirrors the backend Task.status ENUM. */
export const TASK_STATUSES = ["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

interface StatusStyle {
  label: string;
  /** Chip: background, text and border (text labels always accompany colour). */
  chip: string;
  dot: string;
  strike?: boolean;
}

export const STATUS_STYLES: Record<TaskStatus, StatusStyle> = {
  pending: { label: "Pending", chip: "bg-slate-100 text-slate-800 border-slate-300", dot: "bg-slate-500" },
  in_progress: { label: "In Progress", chip: "bg-blue-100 text-blue-800 border-blue-300", dot: "bg-blue-600" },
  in_review: { label: "In Review", chip: "bg-amber-100 text-amber-900 border-amber-300", dot: "bg-amber-500" },
  completed: { label: "Completed", chip: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-600" },
  delayed: { label: "Delayed", chip: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-600" },
  cancelled: { label: "Cancelled", chip: "bg-gray-100 text-gray-500 border-gray-300", dot: "bg-gray-400", strike: true },
};

const FALLBACK: StatusStyle = { label: "Unknown", chip: "bg-gray-100 text-gray-700 border-gray-300", dot: "bg-gray-400" };

export const getStatusStyle = (status?: string | null): StatusStyle =>
  (status && STATUS_STYLES[status as TaskStatus]) || FALLBACK;

/** Overdue is derived from the deadline; it is never persisted as a status. */
export function isTaskOverdue(task: { status?: string | null; deadline?: string | Date | null }, now: Date = new Date()): boolean {
  if (!task.deadline || task.status === "completed" || task.status === "cancelled") return false;
  return isBefore(new Date(task.deadline), now);
}

/** Route for the task a calendar event represents (Workbench / Project task / Team task / Team sub-task). */
export function resolveCalendarTaskPath(task: { id?: string; taskId?: string; teamId?: string | null; parentTaskId?: string | null }): string {
  const id = task.id || task.taskId || "";
  if (task.parentTaskId && task.teamId) return teamSubtaskPath(task.teamId, task.parentTaskId, id);
  if (task.teamId) return teamTaskPath(task.teamId, id);
  return taskWorkbenchPath(id);
}

/**
 * Convert API events into react-big-calendar events.
 * - de-duplicates by task id (multi-assignee tasks never render twice)
 * - clamps the 30 minute display span to the deadline's own day so an end-of-day deadline
 *   (23:59) does not spill into the next day's cell.
 */
export function toCalendarEvents(raw: any[] = []) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const e of raw) {
    const key = String(e.taskId ?? e.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const start = new Date(e.start);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(Math.min(addMinutes(start, 30).getTime(), endOfDay(start).getTime()));
    out.push({ ...e, start, end });
  }
  return out;
}

export function matchesCalendarSearch(event: any, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const people = (event.assignees || []).map((u: any) => `${u.firstName ?? ""} ${u.lastName ?? ""}`);
  const hay = [event.title, event.project?.name, event.team?.name, getStatusStyle(event.status).label, event.priority, ...people]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
