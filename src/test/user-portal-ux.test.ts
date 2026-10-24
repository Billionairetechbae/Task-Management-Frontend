import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const board = readFileSync("src/pages/Board.tsx", "utf8");
const executive = readFileSync("src/pages/DashboardExecutive.tsx", "utf8");
const manager = readFileSync("src/pages/DashboardManager.tsx", "utf8");
const layout = readFileSync("src/components/dashboard/DashboardLayout.tsx", "utf8");
const workbench = readFileSync("src/pages/TaskDetails.tsx", "utf8");

describe("user portal UX improvements", () => {
  it("uses the existing Board mutation and embeds the dashboard task population", () => {
    expect(executive).toContain("<Board embeddedTasks={filteredTasks}");
    expect(manager).toContain("<Board embeddedTasks={filteredTasks}");
    expect(board).toContain("api.updateTask(id, { status })");
    expect(board).toContain("onEmbeddedTaskUpdated");
    expect(board).toContain("context?.previousEmbedded");
  });

  it("places governance and activity under owner/admin Access & Permissions", () => {
    expect(layout).toContain('label: "Access & Permissions"');
    expect(layout).toContain('label: "Governance"');
    expect(layout).toContain('label: "Activity Log", href: "/settings/workspace/activity"');
    expect(layout).not.toContain('label: "Workspace Governance", href: "/settings/workspace/governance"');
  });

  it("starts collaboration collapsed with an accessible toggle and reduced-motion transition", () => {
    expect(workbench).toContain('useState(false)');
    expect(workbench).toContain('aria-label={isTablet ? "Open collaboration panel"');
    expect(workbench).toContain("motion-reduce:transition-none");
  });
});
