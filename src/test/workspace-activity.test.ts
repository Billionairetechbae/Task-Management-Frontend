import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/WorkspaceActivity.tsx", "utf8");
const routes = readFileSync("src/App.tsx", "utf8");
const api = readFileSync("src/lib/api.ts", "utf8");
const layout = readFileSync("src/components/dashboard/DashboardLayout.tsx", "utf8");
const backendController = readFileSync("../admiino-backend/src/controllers/organizationAuditController.js", "utf8");

describe("workspace Activity Log contract", () => {
  it("routes the workspace activity page and exposes it only in owner/admin navigation", () => {
    expect(routes).toContain('path="/settings/workspace/activity"');
    expect(page).toContain('workspaceRole === "owner" || workspaceRole === "admin"');
    expect(layout).toContain('label: "Activity Log", href: "/settings/workspace/activity"');
  });

  it("uses a bounded paginated API and provides forward-looking history wording", () => {
    expect(api).toContain('getOrganizationAuditEvents(filters?:');
    expect(api).toContain('this.request(`/audit-events${');
    expect(page).toContain('limit: 30');
    expect(page).toContain("Earlier or unsupported activity may not appear.");
  });

  it("renders searchable/filterable chronological events with details and safe entity links", () => {
    expect(backendController).toContain('order: [["occurredAt", "DESC"], ["id", "DESC"]]');
    expect(backendController).toContain('Math.min(100');
    expect(backendController).toContain('where: { companyId, userId: req.user.id, status: "active" }');
    expect(page).toContain('aria-label="Activity filters"');
    expect(page).toContain('aria-label="Activity pages"');
    expect(page).toContain('DialogTitle>Activity details');
    expect(page).toContain('return `/projects/${event.entityId}`');
    expect(page).toContain('return `/tasks/${event.entityId}`');
    expect(page).toContain('changeLabel(change.from)');
  });
});
