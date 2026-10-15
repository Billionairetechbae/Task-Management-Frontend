import { describe, expect, it } from "vitest";
import { defaultFormState, formStateFromRecurrence, getBrowserTimeZone, toRecurrencePayload, type RecurrenceFormState } from "../lib/recurrenceForm";
import type { TaskRecurrenceDetails } from "../lib/api";

const base = (over: Partial<RecurrenceFormState> = {}): RecurrenceFormState => ({ ...defaultFormState("2026-10-16T16:00:00.000Z"), ...over });
const rec = (over: Partial<TaskRecurrenceDetails> = {}): TaskRecurrenceDetails => ({
  id: "r1", status: "active", pausedReason: null, timezone: "Africa/Lagos", frequency: "weekly", interval: 1, byWeekday: [5], byMonthDay: null, localTime: "17:00",
  startsAt: "2026-10-16T16:00:00.000Z", endsAt: null, maxOccurrences: null, occurrencesGenerated: 1, nextOccurrenceAt: null, lastGeneratedAt: null, lastRunNote: null, summary: "", upcoming: [], ...over,
});
const create = (state: RecurrenceFormState, needsStart = false) => toRecurrencePayload(state, { mode: "create", timezone: "Europe/London", needsStart });

describe("recurrence form <-> API fields", () => {
  it("the browser timezone is an IANA name", () => {
    expect(getBrowserTimeZone()).toMatch(/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+)*$/);
  });

  it("maps every preset to the structured fields the backend stores (weekdays = weekly Mon-Fri, quarterly = monthly x3)", () => {
    expect(create(base({ preset: "daily", interval: 2 }))).toEqual({ timezone: "Europe/London", frequency: "daily", interval: 2 });
    expect(create(base({ preset: "weekdays", interval: 9 }))).toEqual({ timezone: "Europe/London", frequency: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] });
    expect(create(base({ preset: "weekly", interval: 2, weekdays: [5, 1] }))).toEqual({ timezone: "Europe/London", frequency: "weekly", interval: 2, byWeekday: [1, 5] });
    expect(create(base({ preset: "monthly", interval: 1, monthDay: 25 }))).toEqual({ timezone: "Europe/London", frequency: "monthly", interval: 1, byMonthDay: 25 });
    expect(create(base({ preset: "quarterly", interval: 7, monthDay: -1 }))).toEqual({ timezone: "Europe/London", frequency: "monthly", interval: 3, byMonthDay: -1 });
    expect(create(base({ preset: "yearly", interval: 1, monthDay: 29 }))).toEqual({ timezone: "Europe/London", frequency: "yearly", interval: 1, byMonthDay: 29 });
  });

  it("bounds the interval to 1-99 and never sends an incomplete weekly schedule", () => {
    expect(create(base({ preset: "daily", interval: 500 }))?.interval).toBe(99);
    expect(create(base({ preset: "daily", interval: 0 }))?.interval).toBe(1);
    expect(create(base({ preset: "weekly", weekdays: [] }))).toBeNull();
  });

  it("ends: never omits both, 'after' sends the total INCLUDING the first task, 'on' sends the end of that local day", () => {
    const never = create(base({ endsMode: "never" }))!;
    expect("endsAt" in never || "maxOccurrences" in never).toBe(false);
    expect(create(base({ endsMode: "after", maxOccurrences: 5 }))?.maxOccurrences).toBe(5);
    expect(create(base({ endsMode: "on", endsOn: "" }))).toBeNull();
    const on = create(base({ endsMode: "on", endsOn: "2026-12-31" }))!;
    const end = new Date(on.endsAt!);
    expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes()]).toEqual([2026, 11, 31, 23, 59]);
  });

  it("a task without a due date must supply the start; it is sent as an ISO instant", () => {
    expect(create(base({ startsAt: "" }), true)).toBeNull();
    const payload = create(base({ startsAt: "2026-11-02T09:30" }), true)!;
    expect(payload.startsAt).toBe(new Date("2026-11-02T09:30").toISOString());
    expect("startsAt" in create(base(), false)!).toBe(false);
  });

  it("edit sends the time and explicit nulls so ends can be cleared; it never resends the timezone", () => {
    const payload = toRecurrencePayload(base({ preset: "daily", localTime: "08:15", endsMode: "never" }), { mode: "edit", timezone: "Europe/London" })!;
    expect(payload).toEqual({ frequency: "daily", interval: 1, byWeekday: null, byMonthDay: null, localTime: "08:15", endsAt: null, maxOccurrences: null });
    expect("timezone" in payload).toBe(false);
  });

  it("infers the preset back from a stored series", () => {
    expect(formStateFromRecurrence(rec({ byWeekday: [1, 2, 3, 4, 5] })).preset).toBe("weekdays");
    expect(formStateFromRecurrence(rec({ byWeekday: [1, 2, 3, 4, 5], interval: 2 })).preset).toBe("weekly");
    expect(formStateFromRecurrence(rec({ frequency: "monthly", interval: 3, byWeekday: null, byMonthDay: 15 })).preset).toBe("quarterly");
    expect(formStateFromRecurrence(rec({ frequency: "monthly", interval: 2, byWeekday: null, byMonthDay: 15 })).preset).toBe("monthly");
    expect(formStateFromRecurrence(rec({ frequency: "yearly", byWeekday: null, byMonthDay: 29 }))).toMatchObject({ preset: "yearly", monthDay: 29 });
    expect(formStateFromRecurrence(rec({ maxOccurrences: 5 }))).toMatchObject({ endsMode: "after", maxOccurrences: 5 });
    expect(formStateFromRecurrence(rec({ endsAt: "2026-12-31T22:59:59.000Z" })).endsMode).toBe("on");
  });
});
