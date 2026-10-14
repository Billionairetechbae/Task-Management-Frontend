import { describe, expect, it } from "vitest";
import {
  TASK_STATUSES,
  STATUS_STYLES,
  getStatusStyle,
  isTaskOverdue,
  matchesCalendarSearch,
  resolveCalendarTaskPath,
  toCalendarEvents,
} from "@/lib/calendarStatus";

describe("calendar status mapping", () => {
  it("every Task.status enum value has a distinct label and colour", () => {
    expect(TASK_STATUSES).toEqual(["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"]);
    const labels = TASK_STATUSES.map((s) => STATUS_STYLES[s].label);
    expect(new Set(labels).size).toBe(TASK_STATUSES.length);
    expect(new Set(TASK_STATUSES.map((s) => STATUS_STYLES[s].chip)).size).toBe(TASK_STATUSES.length);
    expect(getStatusStyle("completed").chip).toContain("emerald");
    expect(getStatusStyle("in_progress").chip).toContain("blue");
    expect(getStatusStyle("in_review").chip).toContain("amber");
    expect(getStatusStyle("delayed").chip).toContain("red");
    expect(getStatusStyle("pending").chip).toContain("slate");
    expect(getStatusStyle("cancelled").strike).toBe(true);
  });

  it("overdue is derived from the deadline and never applies to completed/cancelled", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    const past = "2026-10-20T22:59:59.999Z";
    expect(isTaskOverdue({ status: "pending", deadline: past }, now)).toBe(true);
    expect(isTaskOverdue({ status: "delayed", deadline: past }, now)).toBe(true);
    expect(isTaskOverdue({ status: "completed", deadline: past }, now)).toBe(false);
    expect(isTaskOverdue({ status: "cancelled", deadline: past }, now)).toBe(false);
    expect(isTaskOverdue({ status: "pending", deadline: "2026-10-30T10:00:00Z" }, now)).toBe(false);
    expect(isTaskOverdue({ status: "pending", deadline: null }, now)).toBe(false);
  });

  it("routes tasks to workbench, team task and team sub-task pages", () => {
    expect(resolveCalendarTaskPath({ id: "t1" })).toBe("/task-details/t1");
    expect(resolveCalendarTaskPath({ id: "t1", teamId: "tm" })).toBe("/teams/tm/tasks/t1");
    expect(resolveCalendarTaskPath({ id: "s1", teamId: "tm", parentTaskId: "t1" })).toBe("/teams/tm/tasks/t1/subtasks/s1");
  });

  it("de-duplicates by task and keeps an end-of-day deadline inside its own day", () => {
    const start = new Date(2026, 9, 20, 23, 59, 59, 999);
    const events = toCalendarEvents([
      { id: "a", taskId: "a", start: start.toISOString(), title: "x" },
      { id: "a", taskId: "a", start: start.toISOString(), title: "x" },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].end.getDate()).toBe(20);
    expect(events[0].end.getTime()).toBeGreaterThanOrEqual(events[0].start.getTime());
  });

  it("search matches title, project, team, assignee and status label", () => {
    const e = { title: "Monthly report", status: "in_review", project: { name: "Finance" }, team: { name: "Ops" }, assignees: [{ firstName: "Ada", lastName: "Obi" }] };
    for (const q of ["monthly", "finance", "ops", "ada", "in review", ""]) expect(matchesCalendarSearch(e, q)).toBe(true);
    expect(matchesCalendarSearch(e, "zzz")).toBe(false);
  });
});
