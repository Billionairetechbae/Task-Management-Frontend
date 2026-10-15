import type { TaskRecurrenceDetails, TaskRecurrenceInput } from "@/lib/api";

/**
 * UI presets <-> the structured fields the API stores. The backend owns every rule (clamping, DST, limits); this file only
 * translates the form: weekdays = weekly Mon-Fri, quarterly = monthly every 3 months.
 */
export type RepeatPreset = "daily" | "weekdays" | "weekly" | "monthly" | "quarterly" | "yearly";
export type EndsMode = "never" | "on" | "after";

export interface RecurrenceFormState {
  preset: RepeatPreset;
  interval: number;
  weekdays: number[];      // 0 = Sunday
  monthDay: number;        // 1-31, -1 = last day
  endsMode: EndsMode;
  endsOn: string;          // yyyy-MM-dd (browser-local day)
  maxOccurrences: number;  // total occurrences INCLUDING the task the series starts from
  localTime: string;       // HH:mm (edit only)
  startsAt: string;        // datetime-local; required only when the task has no due date
}

export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const PRESET_LABELS: Record<RepeatPreset, string> = {
  daily: "Daily", weekdays: "Every weekday", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly",
};
/** Presets that take an "Every N" value. */
export const PRESETS_WITH_INTERVAL: RepeatPreset[] = ["daily", "weekly", "monthly", "yearly"];
export const INTERVAL_UNIT: Record<RepeatPreset, string> = { daily: "day(s)", weekdays: "", weekly: "week(s)", monthly: "month(s)", quarterly: "", yearly: "year(s)" };

/** The browser's IANA timezone. Interactive recurrence APIs require it; the server never substitutes a default. */
export const getBrowserTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

const pad = (n: number) => String(n).padStart(2, "0");

export function defaultFormState(taskDeadline?: string | null): RecurrenceFormState {
  const anchor = taskDeadline ? new Date(taskDeadline) : new Date();
  return {
    preset: "weekly", interval: 1, weekdays: [anchor.getDay()], monthDay: anchor.getDate(),
    endsMode: "never", endsOn: "", maxOccurrences: 10, localTime: `${pad(anchor.getHours())}:${pad(anchor.getMinutes())}`, startsAt: "",
  };
}

export function formStateFromRecurrence(rec: TaskRecurrenceDetails): RecurrenceFormState {
  const weekdays = rec.byWeekday ?? [];
  const isWeekdays = rec.frequency === "weekly" && rec.interval === 1 && weekdays.length === 5 && [1, 2, 3, 4, 5].every((d) => weekdays.includes(d));
  let preset: RepeatPreset = rec.frequency;
  if (isWeekdays) preset = "weekdays";
  else if (rec.frequency === "monthly" && rec.interval === 3) preset = "quarterly";
  return {
    preset, interval: preset === "weekdays" || preset === "quarterly" ? 1 : rec.interval,
    weekdays: weekdays.length ? weekdays : [new Date(rec.startsAt).getDay()], monthDay: rec.byMonthDay ?? new Date(rec.startsAt).getDate(),
    endsMode: rec.maxOccurrences != null ? "after" : rec.endsAt ? "on" : "never",
    endsOn: rec.endsAt ? `${new Date(rec.endsAt).getFullYear()}-${pad(new Date(rec.endsAt).getMonth() + 1)}-${pad(new Date(rec.endsAt).getDate())}` : "",
    maxOccurrences: rec.maxOccurrences ?? 10, localTime: rec.localTime, startsAt: "",
  };
}

export interface PayloadOptions {
  mode: "create" | "edit";
  timezone: string;
  /** True when the task has no due date and the user must pick the start. */
  needsStart?: boolean;
}

/** Form state -> API payload. Returns null while the form is incomplete (e.g. weekly with no weekday chosen). */
export function toRecurrencePayload(state: RecurrenceFormState, { mode, timezone, needsStart = false }: PayloadOptions): TaskRecurrenceInput | null {
  const interval = Math.max(1, Math.min(99, Math.round(state.interval) || 1));
  const payload: TaskRecurrenceInput = {};
  switch (state.preset) {
    case "daily": Object.assign(payload, { frequency: "daily", interval, byWeekday: null, byMonthDay: null }); break;
    case "weekdays": Object.assign(payload, { frequency: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5], byMonthDay: null }); break;
    case "weekly":
      if (!state.weekdays.length) return null;
      Object.assign(payload, { frequency: "weekly", interval, byWeekday: [...state.weekdays].sort((a, b) => a - b), byMonthDay: null });
      break;
    case "monthly": Object.assign(payload, { frequency: "monthly", interval, byWeekday: null, byMonthDay: state.monthDay }); break;
    case "quarterly": Object.assign(payload, { frequency: "monthly", interval: 3, byWeekday: null, byMonthDay: state.monthDay }); break;
    case "yearly": Object.assign(payload, { frequency: "yearly", interval, byWeekday: null, byMonthDay: state.monthDay }); break;
  }
  if (mode === "create") { payload.timezone = timezone; delete payload.byWeekday; delete payload.byMonthDay; Object.assign(payload, toCreateFields(state)); }
  else { payload.localTime = state.localTime; }

  if (state.endsMode === "on") {
    if (!state.endsOn) return null;
    payload.endsAt = new Date(`${state.endsOn}T23:59:59`).toISOString(); // end of that day in the browser's zone
    payload.maxOccurrences = null;
  } else if (state.endsMode === "after") {
    payload.maxOccurrences = Math.max(1, Math.round(state.maxOccurrences) || 1);
    payload.endsAt = null;
  } else {
    payload.endsAt = null; payload.maxOccurrences = null;
  }
  if (mode === "create") {
    if (needsStart) {
      if (!state.startsAt) return null;
      payload.startsAt = new Date(state.startsAt).toISOString();
    }
    if (payload.endsAt === null) delete payload.endsAt;
    if (payload.maxOccurrences === null) delete payload.maxOccurrences;
  }
  return payload;
}

/** Create sends only what applies to the chosen preset; the server fills anchor-derived defaults. */
function toCreateFields(state: RecurrenceFormState): TaskRecurrenceInput {
  const out: TaskRecurrenceInput = {};
  if (state.preset === "weekdays") { out.byWeekday = [1, 2, 3, 4, 5]; }
  if (state.preset === "weekly") { out.byWeekday = [...state.weekdays].sort((a, b) => a - b); }
  if (["monthly", "quarterly", "yearly"].includes(state.preset)) { out.byMonthDay = state.monthDay; }
  return out;
}
