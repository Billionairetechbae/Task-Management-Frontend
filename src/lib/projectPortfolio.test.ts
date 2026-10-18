import { describe, expect, it } from "vitest";
import type { ProjectHealthProject } from "@/lib/api";
import { defaultPortfolioFilters, filterAndSortPortfolioProjects, portfolioIsOverdue, portfolioNeedsAttention } from "@/lib/projectPortfolio";
import { getSearchNavigation } from "@/components/dashboard/searchNavigation";

const today = new Date("2026-10-17T12:00:00.000Z");

type RowOverrides = Partial<Omit<ProjectHealthProject, "project" | "metrics">> & {
  project?: Partial<ProjectHealthProject["project"]>;
  metrics?: Partial<ProjectHealthProject["metrics"]>;
};

function row(overrides: RowOverrides = {}): ProjectHealthProject {
  const base: ProjectHealthProject = {
    project: {
      id: "p1", name: "Atlas Launch", description: "Customer rollout", status: "active",
      dueDate: "2026-10-20T00:00:00.000Z", endDate: null, leadId: "u1", teamId: "t1",
      owner: { id: "u1", firstName: "Amina", lastName: "Owner" }, team: { id: "t1", name: "Delivery" },
      updatedAt: "2026-10-15T00:00:00.000Z",
    },
    healthScore: 72, healthStatus: "watchlist", healthLabel: "Watchlist", healthDescription: "Needs attention",
    metrics: { totalTasks: 4, completedTasks: 2, cancelledTasks: 0, openTasks: 2, pendingTasks: 1, inProgressTasks: 1, delayedTasks: 0, overdueTasks: 0, urgentOpenTasks: 0, staleOpenTasks: 0, ownerlessOpenTasks: 0, completionRate: 50 },
    workload: { topAssignee: null, topAssigneeOpenTasks: 0, concentrationPercentage: 0 }, riskReasons: [], recommendedActions: [], priorityTasks: [], generatedAt: today.toISOString(),
    lastActivity: "2026-10-16T00:00:00.000Z",
  };
  return { ...base, ...overrides, project: { ...base.project, ...overrides.project }, metrics: { ...base.metrics, ...overrides.metrics } };
}

describe("Project Portfolio filtering and sorting", () => {
  const base = [
    row(),
    row({ project: { id: "p2", name: "Beacon", status: "active", dueDate: "2026-10-18T00:00:00.000Z", owner: { id: "u2", firstName: "Ben", lastName: "Lead" }, team: { id: "t2", name: "Research" } }, healthStatus: "critical", healthLabel: "Critical", metrics: { overdueTasks: 2, completionRate: 20 }, lastActivity: "2026-10-10T00:00:00.000Z" }),
    row({ project: { id: "p3", name: "Cedar", status: "archived", dueDate: "2026-09-01T00:00:00.000Z", owner: null, team: null }, healthStatus: "healthy", metrics: { completedTasks: 4, openTasks: 0, overdueTasks: 0, completionRate: 100 } }),
  ];

  it("searches project, owner, and Team names without case sensitivity", () => {
    expect(filterAndSortPortfolioProjects(base, { ...defaultPortfolioFilters, search: "AMINA" }, today).map((item) => item.project.id)).toContain("p1");
    expect(filterAndSortPortfolioProjects(base, { ...defaultPortfolioFilters, search: "research" }, today).map((item) => item.project.id)).toEqual(["p2"]);
  });

  it("combines status, health, owner, Team, deadline, progress, and attention filters", () => {
    const result = filterAndSortPortfolioProjects(base, {
      ...defaultPortfolioFilters, status: "active", health: "critical", ownerId: "u2", teamId: "t2", deadline: "next_7_days", progress: "0_24", needsAttention: true,
    }, today);
    expect(result.map((item) => item.project.id)).toEqual(["p2"]);
  });

  it("filters overdue work and upcoming deadlines while excluding completed/archived project dates", () => {
    expect(portfolioIsOverdue(base[1], today)).toBe(true);
    expect(portfolioIsOverdue(base[2], today)).toBe(false);
    expect(portfolioNeedsAttention(base[0], today)).toBe(true);
    expect(filterAndSortPortfolioProjects(base, { ...defaultPortfolioFilters, deadline: "overdue" }, today).map((item) => item.project.id)).toEqual(["p2"]);
  });

  it("sorts attention first by explicit risk priority and supports other selected sort orders", () => {
    expect(filterAndSortPortfolioProjects(base, defaultPortfolioFilters, today).map((item) => item.project.id)).toEqual(["p2", "p1", "p3"]);
    expect(filterAndSortPortfolioProjects(base, { ...defaultPortfolioFilters, sort: "name" }, today).map((item) => item.project.name)).toEqual(["Atlas Launch", "Beacon", "Cedar"]);
    expect(filterAndSortPortfolioProjects(base, { ...defaultPortfolioFilters, sort: "progress" }, today).map((item) => item.project.id)).toEqual(["p2", "p1", "p3"]);
  });

  it("makes Portfolio searchable for authorized workspace roles", () => {
    expect(getSearchNavigation("portfolio", "member", () => true).Navigation?.[0]?.href).toBe("/projects/portfolio");
    expect(getSearchNavigation("portfolio", "guest", () => true).Navigation).toBeUndefined();
  });

  it("adds Automations navigation only for workspace owners and admins", () => {
    expect(getSearchNavigation("workflow", "owner", () => true).Settings?.[0]?.href).toBe("/settings/workspace/automations");
    expect(getSearchNavigation("automation", "admin", () => true).Settings?.[0]?.title).toBe("Automations");
    expect(getSearchNavigation("rules", "member", () => true).Settings).toBeUndefined();
  });

  it("shows Workspace Governance in search only to owners and admins", () => {
    expect(getSearchNavigation("access policies", "owner", () => true).Settings?.[0]?.href).toBe("/settings/workspace/governance");
    expect(getSearchNavigation("admin controls", "admin", () => true).Settings?.[0]?.title).toBe("Workspace Governance");
    expect(getSearchNavigation("governance", "member", () => true).Settings).toBeUndefined();
  });
});
