import { describe, expect, it } from "vitest";
import {
  blankProjectBody, blankTaskBody, bodyNodes, canManageTemplates, configFromRepeat, dependencyChoices, hasAnyOffset, needsDefaultDueTime,
  newIdempotencyKey, offsetLabel, projectTaskDefaults, removeProjectTask, repeatFromConfig, blankRepeat, uniqueKey, moveItem,
} from "../lib/templateForm";

const t = (key: string, over: any = {}) => ({ ...projectTaskDefaults(key, 0), ...over });

describe("templateForm helpers", () => {
  it("manager roles can manage; plain members cannot", () => {
    expect(canManageTemplates("owner")).toBe(true);
    expect(canManageTemplates("admin")).toBe(true);
    expect(canManageTemplates("manager")).toBe(true);
    expect(canManageTemplates("member")).toBe(false);
    expect(canManageTemplates(null, "team_member")).toBe(false);
  });

  it("idempotency keys are unique per flow", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  it("never assumes a time: an offset without a time asks for a default due time", () => {
    expect(needsDefaultDueTime([{ dueOffsetDays: 2, localTime: null }])).toBe(true);
    expect(needsDefaultDueTime([{ dueOffsetDays: 2, localTime: "09:00" }])).toBe(false);
    expect(needsDefaultDueTime([{ dueOffsetDays: null, localTime: null }])).toBe(false);
    expect(hasAnyOffset([{ dueOffsetDays: 0 }])).toBe(true);
    expect(offsetLabel({ dueOffsetDays: 3, localTime: null })).toMatch(/time chosen when used/);
    expect(offsetLabel({ dueOffsetDays: 0, localTime: "09:00" })).toBe("Start day at 09:00");
  });

  it("project bodies have no recurrence; task bodies default to none", () => {
    expect(JSON.stringify(blankProjectBody())).not.toMatch(/recurrence/);
    expect(blankTaskBody().task.recurrence).toBeNull();
  });

  it("dependencyChoices excludes self, descendants-of-dependents (cycles) and parent/child pairs", () => {
    const tasks = [t("a"), t("b", { dependsOn: ["a"] }), t("c", { dependsOn: ["b"] }), t("d"), t("a1", { parentKey: "a" })];
    expect(dependencyChoices(tasks, "a").map((x) => x.key).sort()).toEqual(["d"]);
    expect(dependencyChoices(tasks, "d").map((x) => x.key).sort()).toEqual(["a", "b", "c"].concat(["a1"]).sort());
  });

  it("removing a task drops its subtasks and every dependsOn reference", () => {
    const tasks = [t("a"), t("a1", { parentKey: "a" }), t("b", { dependsOn: ["a", "a1"] })];
    const out = removeProjectTask(tasks, "a");
    expect(out.map((x) => x.key)).toEqual(["b"]);
    expect(out[0].dependsOn).toEqual([]);
  });

  it("recurrence round-trips through the form state", () => {
    const cfg = { frequency: "weekly" as const, interval: 1, byWeekday: [1, 2, 3, 4, 5], byMonthDay: null, maxOccurrences: 6 };
    const state = repeatFromConfig(cfg);
    expect(state.preset).toBe("weekdays");
    expect(configFromRepeat(state)).toEqual(cfg);
    expect(configFromRepeat(blankRepeat())).toBeNull();
    expect(configFromRepeat({ ...blankRepeat(), enabled: true, preset: "weekly", weekdays: [] })).toBeNull();
  });

  it("bodyNodes flattens root + subtasks and misc utilities behave", () => {
    const body = blankTaskBody();
    body.task.title = "Root";
    body.task.subtasks = [{ key: "sub1", ...blankTaskBody().task, subtasks: undefined } as any];
    expect(bodyNodes(body).length).toBe(2);
    expect(uniqueKey(["task", "task-2"], "task")).not.toBe("task");
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
  });
});
