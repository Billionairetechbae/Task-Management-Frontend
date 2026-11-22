import { describe, expect, it } from "vitest";
import { getProjectStatusLabel, PROJECT_STATUS_OPTIONS } from "@/lib/projectStatus";

describe("project status presentation", () => {
  it("uses the supported lifecycle values and human-readable labels", () => {
    expect(PROJECT_STATUS_OPTIONS.map(({ value }) => value)).toEqual([
      "planning",
      "active",
      "on_hold",
      "completed",
      "cancelled",
      "archived",
    ]);
    expect(getProjectStatusLabel("completed")).toBe("Completed");
    expect(getProjectStatusLabel("on_hold")).toBe("On Hold");
  });
});
