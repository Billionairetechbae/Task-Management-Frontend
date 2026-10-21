import { describe, expect, it } from "vitest";
import { normalizeCompanyAssistantsResponse, teamMemberRows } from "@/lib/api";

describe("company assistants API response", () => {
  it("accepts the current contract (data.members) including a valid empty list", () => {
    expect(teamMemberRows({ status: "success", results: 0, data: { members: [] } })).toEqual([]);
    expect(teamMemberRows({ status: "success", results: 2, data: { members: [{ isVerified: true }, { isVerified: false }] } } as any)).toHaveLength(2);
  });

  it("still accepts the legacy contract (data.team_members)", () => {
    expect(normalizeCompanyAssistantsResponse({ status: "success", results: 0, data: { team_members: [] } }).data.team_members).toEqual([]);
  });

  it("rejects a malformed 200 with a useful contract error instead of reporting zero members", () => {
    expect(() => normalizeCompanyAssistantsResponse({ status: "success", results: 0, data: {} } as any)).toThrow("Team member data was unavailable");
    expect(() => normalizeCompanyAssistantsResponse(undefined as any)).toThrow("Team member data was unavailable");
    expect(() => normalizeCompanyAssistantsResponse({ status: "success", results: 0, data: { members: {} } } as any)).toThrow("Team member data was unavailable");
  });
});
