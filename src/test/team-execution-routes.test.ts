import { describe, expect, it } from "vitest";
import { getNotificationLink } from "@/lib/notificationLink";
import { resolveTaskPath, taskWorkbenchPath, teamSubtaskPath, teamTaskPath } from "@/lib/taskExecutionRoutes";

describe("Team execution route resolution", () => {
  it("keeps normal parent tasks in Task Workbench", () => {
    expect(resolveTaskPath({ id: "task-1", teamId: null, parentTaskId: null })).toBe(taskWorkbenchPath("task-1"));
  });

  it("opens a team parent in Team Task View only from Team context", () => {
    const task = { id: "task-1", teamId: "team-1", parentTaskId: null };
    expect(resolveTaskPath(task)).toBe(taskWorkbenchPath("task-1"));
    expect(resolveTaskPath(task, "team")).toBe(teamTaskPath("team-1", "task-1"));
  });

  it("never resolves a team sub-task to generic Task Workbench", () => {
    expect(resolveTaskPath({ id: "sub-1", teamId: "team-1", parentTaskId: "task-1" })).toBe(teamSubtaskPath("team-1", "task-1", "sub-1"));
  });

  it("resolves sub-task notifications into their parent Team execution context", () => {
    expect(getNotificationLink({ type: "subtask_created", data: { taskId: "sub-1", parentTaskId: "task-1", teamId: "team-1" } } as any)).toBe(teamSubtaskPath("team-1", "task-1", "sub-1"));
  });
});
