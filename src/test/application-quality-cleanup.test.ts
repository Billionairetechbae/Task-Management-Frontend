import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const automations = readFileSync("src/pages/WorkspaceAutomations.tsx", "utf8");
const timeTracking = readFileSync("src/pages/TimeTracking.tsx", "utf8");
const memberProfile = readFileSync("src/pages/TeamMemberProfile.tsx", "utf8");

describe("application quality cleanup", () => {
  it("lazy-loads rarely used portal routes", () => {
    expect(app).toContain('lazy(() => import("./pages/Harmony"))');
    expect(app).toContain('lazy(() => import("@/pages/WorkspaceInsights"))');
    expect(app).toContain("<Suspense fallback={<RouteFallback />}");
  });

  it("scopes automation caches and only loads member lookups when the builder needs them", () => {
    expect(automations).toContain('["workspace-automations", activeCompanyId]');
    expect(automations).toContain('builder && recipientType === "selected_members"');
    expect(automations).toContain('["automation-executions", activeCompanyId, historyId]');
  });

  it("deduplicates the initial time summary request", () => {
    expect(timeTracking).toContain("const summaryFilters = hasExtraFilters ? filters : baseFilters;");
    expect(timeTracking).toContain('["time-summary", activeCompanyId, summaryFilters]');
  });

  it("surfaces independent team-member profile failures with retry state", () => {
    expect(memberProfile).toContain("workspaceRes.status === \"rejected\"");
    expect(memberProfile).toContain("profileRes.status === \"rejected\"");
    expect(memberProfile).toContain('onClick={() => void loadMember()}');
  });
});
