import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const taskDetails = readFileSync("src/pages/TaskDetails.tsx", "utf8");
const subtasks = readFileSync("src/components/tasks/SubtaskList.tsx", "utf8");
const teams = readFileSync("src/pages/Teams.tsx", "utf8");
const workspace = readFileSync("src/components/teams/TeamWorkspacePanel.tsx", "utf8");
const api = readFileSync("src/lib/api.ts", "utf8");

describe("Phase 5B workspace and task files contract", () => {
  it("keeps task files and comment attachments in the execution room", () => {
    expect(taskDetails).toContain("Attachments");
    expect(taskDetails).toContain("comment.attachments");
    expect(api).toContain("files?: File[]");
  });

  it("links subtasks back to the existing task room", () => {
    expect(subtasks).toContain("to={`/tasks/${subtask.id}`}");
    expect(subtasks).toContain("Assign to Team member");
  });

  it("adds persistent Team workspace sections and empty states", () => {
    expect(teams).toContain("TeamWorkspacePanel");
    expect(workspace).toContain("Discussion");
    expect(workspace).toContain("Assignments");
    expect(workspace).toContain("Activity");
    expect(workspace).toContain("This Team has no active assignments.");
    expect(workspace).toContain("No Team messages yet.");
  });
});
