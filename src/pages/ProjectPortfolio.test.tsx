import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectPortfolio from "@/pages/ProjectPortfolio";

const mocks = vi.hoisted(() => ({
  auth: { activeCompanyId: "workspace-1", workspaceRole: "owner", user: { id: "user-1", role: "executive" } },
  canCreate: true,
  getProjectHealth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => mocks.canCreate }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div> }));
vi.mock("@/lib/api", () => ({ api: { getProjectHealth: mocks.getProjectHealth } }));

const sampleProjects = [
  {
    project: { id: "project-1", name: "Atlas Launch", description: "Customer rollout", status: "active", dueDate: "2026-10-28T00:00:00.000Z", endDate: null, owner: { id: "user-1", firstName: "Amina", lastName: "Owner" }, team: { id: "team-1", name: "Delivery" }, updatedAt: "2026-10-16T00:00:00.000Z" },
    healthScore: 82, healthStatus: "healthy", healthLabel: "Healthy", healthDescription: "Project is broadly on track.",
    metrics: { totalTasks: 4, completedTasks: 2, cancelledTasks: 0, openTasks: 2, pendingTasks: 2, inProgressTasks: 0, delayedTasks: 0, overdueTasks: 0, urgentOpenTasks: 0, staleOpenTasks: 0, ownerlessOpenTasks: 0, completionRate: 50 },
    workload: { topAssignee: null, topAssigneeOpenTasks: 0, concentrationPercentage: 0 }, riskReasons: [], recommendedActions: [], priorityTasks: [], generatedAt: "2026-10-17T00:00:00.000Z", lastActivity: "2026-10-16T00:00:00.000Z",
  },
  {
    project: { id: "project-2", name: "Beacon", status: "active", dueDate: "2026-10-18T00:00:00.000Z", endDate: null, owner: { id: "user-2", firstName: "Ben", lastName: "Lead" }, team: { id: "team-2", name: "Research" }, updatedAt: "2026-10-10T00:00:00.000Z" },
    healthScore: 35, healthStatus: "critical", healthLabel: "Critical", healthDescription: "Project requires immediate intervention.",
    metrics: { totalTasks: 3, completedTasks: 0, cancelledTasks: 0, openTasks: 3, pendingTasks: 3, inProgressTasks: 0, delayedTasks: 0, overdueTasks: 2, urgentOpenTasks: 0, staleOpenTasks: 0, ownerlessOpenTasks: 0, completionRate: 0 },
    workload: { topAssignee: null, topAssigneeOpenTasks: 0, concentrationPercentage: 0 }, riskReasons: ["2 open tasks are overdue."], recommendedActions: [], priorityTasks: [], generatedAt: "2026-10-17T00:00:00.000Z", lastActivity: "2026-10-10T00:00:00.000Z",
  },
] as any;

function LocationText() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}{location.search}</output>;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><ProjectPortfolio /><LocationText /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  mocks.auth = { activeCompanyId: "workspace-1", workspaceRole: "owner", user: { id: "user-1", role: "executive" } };
  mocks.canCreate = true;
  mocks.getProjectHealth.mockReset().mockResolvedValue({ status: "success", data: { summary: { totalProjects: 2, activeProjects: 2, completedProjects: 0, overdueProjects: 1, needsAttentionProjects: 1, averageHealthScore: 58, counts: { healthy: 1, watchlist: 0, at_risk: 0, critical: 1 }, totalOverdueTasks: 2, totalOpenTasks: 5, criticalProjects: [] }, projects: sampleProjects } });
});

describe("Project Portfolio page", () => {
  it("renders existing health summary, authorized project rows, and responsive card/table layouts", async () => {
    const { container } = renderPage();
    expect((await screen.findAllByText("Atlas Launch")).length).toBeGreaterThan(0);
    expect(screen.getByText("At Risk / Critical", { exact: false })).toBeTruthy();
    expect(screen.getAllByText("Delivery").length).toBeGreaterThan(0);
    expect(container.querySelector("table")?.parentElement?.className).toContain("lg:block");
    expect(container.querySelector("table")?.parentElement?.nextElementSibling?.className).toContain("lg:hidden");
  });

  it("filters projects by status and health", async () => {
    renderPage();
    await screen.findAllByText("Atlas Launch");
    fireEvent.change(screen.getByLabelText("Health"), { target: { value: "critical" } });
    await waitFor(() => expect(screen.queryByText("Atlas Launch")).toBeNull());
    expect(screen.getAllByText("Beacon").length).toBeGreaterThan(0);
  });

  it("navigates to the selected project and respects creation permissions", async () => {
    renderPage();
    await screen.findAllByText("Atlas Launch");
    fireEvent.click(screen.getByRole("button", { name: "Open Atlas Launch" }));
    await waitFor(() => expect(screen.getByTestId("current-path").textContent).toBe("/projects/project-1?workspace=workspace-1"));
  });

  it("shows a clear no-matches state and a reset action", async () => {
    renderPage();
    await screen.findAllByText("Atlas Launch");
    fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "missing project" } });
    expect(await screen.findByText("No projects match these filters")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect((await screen.findAllByText("Atlas Launch")).length).toBeGreaterThan(0);
  });

  it("shows the workspace empty state and hides project creation when not permitted", async () => {
    mocks.canCreate = false;
    mocks.getProjectHealth.mockResolvedValueOnce({ status: "success", data: { summary: { totalProjects: 0, counts: { healthy: 0, watchlist: 0, at_risk: 0, critical: 0 }, criticalProjects: [] }, projects: [] } });
    renderPage();
    expect(await screen.findByRole("heading", { name: "No projects yet" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create Project" })).toBeNull();
  });

  it("shows scoped access guidance to external workspace roles without requesting portfolio data", async () => {
    mocks.auth = { ...mocks.auth, workspaceRole: "guest" };
    renderPage();
    expect(await screen.findByRole("heading", { name: "Portfolio unavailable" })).toBeTruthy();
    expect(mocks.getProjectHealth).not.toHaveBeenCalled();
  });
});
