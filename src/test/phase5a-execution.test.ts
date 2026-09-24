import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const taskDetails = readFileSync("src/pages/TaskDetails.tsx", "utf8");
const subtasks = readFileSync("src/components/tasks/SubtaskList.tsx", "utf8");
const api = readFileSync("src/lib/api.ts", "utf8");

describe("Phase 5A execution room contract", () => {
  it("renders deterministic Team execution and review controls", () => {
    expect(taskDetails).toContain("Team Execution");
    expect(taskDetails).toContain("Submit for Executive Review");
    expect(taskDetails).toContain("Approve and Complete");
    expect(taskDetails).toContain("Reopen Task");
    expect(taskDetails).toContain("progressPercent");
  });

  it("keeps Team member execution separate from decomposition", () => {
    expect(subtasks).toContain("Assign to Team member");
    expect(subtasks).toContain("canUpdate");
    expect(subtasks).toContain("No active members are available in this Team.");
    expect(taskDetails).toContain("parentTeamId={task.teamId}");
  });

  it("supports review status and threaded comments in the API contract", () => {
    expect(api).toContain('"in_review"');
    expect(api).toContain("parentCommentId");
    expect(api).toContain("mentionedUserIds");
  });
});
