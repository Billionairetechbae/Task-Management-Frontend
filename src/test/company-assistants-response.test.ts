import { describe, expect, it } from "vitest";
import { normalizeCompanyAssistantsResponse } from "@/lib/api";

describe("company assistants API response", () => {
  it("preserves a valid empty team member list", () => {
    expect(normalizeCompanyAssistantsResponse({ status: "success", results: 0, data: { team_members: [] } }).data.team_members).toEqual([]);
  });

  it("rejects a malformed response with a useful contract error", () => {
    expect(() => normalizeCompanyAssistantsResponse({ status: "success", results: 0, data: {} } as any)).toThrow("Team member data was unavailable");
  });
});
