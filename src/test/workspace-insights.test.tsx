import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkspaceInsights from "@/pages/WorkspaceInsights";

const apiMock = vi.hoisted(() => ({
  listTeams: vi.fn(),
  getProjects: vi.fn(),
  getWorkspaceInsights: vi.fn(),
  getWorkspaceInsightsHistory: vi.fn(),
}));
const authMock = vi.hoisted(() => ({ activeCompanyId: "workspace-a" }));

vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => <select aria-label="insight-filter" value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><WorkspaceInsights /></QueryClientProvider>);
}

const insights = {
  summary: { totalProjects: 2, projectsByStatus: { active: 2 }, totalTasks: 4, tasksByStatus: { pending: 1, in_progress: 1, completed: 2 }, completedTasks: 2, openTasks: 2, overdueTasks: 1, unassignedTasks: 1, projectsWithTeam: 1, projectsWithoutTeam: 1, tasksWithTeam: 3, tasksWithoutTeam: 1 },
  teams: [{ id: "team-a", name: "Marketing", memberCount: 2, projectCount: 1, taskCount: 3, openTasks: 2, overdueTasks: 1, tasksByStatus: {} }],
  projects: [{ id: "project-a", name: "Launch", status: "active", team: { id: "team-a", name: "Marketing" }, taskCount: 3, completedTasks: 2, openTasks: 1, overdueTasks: 1, completionRate: 67, riskIndicators: ["1 overdue open task(s)"] }],
  workload: { unassignedTasks: 1, members: [] },
  filters: { teamId: null, projectId: null, status: null, priority: null },
  generatedAt: "2026-09-19T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.activeCompanyId = "workspace-a";
  apiMock.listTeams.mockResolvedValue({ data: { teams: [{ id: "team-a", name: "Marketing" }] } });
  apiMock.getProjects.mockResolvedValue({ data: { projects: [{ id: "project-a", name: "Launch" }] } });
  apiMock.getWorkspaceInsights.mockResolvedValue({ data: insights });
  apiMock.getWorkspaceInsightsHistory.mockResolvedValue({ data: { period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-19T00:00:00.000Z", timezone: "UTC", activityDerived: true }, summary: { totalActivity: 2, taskCreated: 1, statusChanges: 1, completedStatusChanges: 1, assignmentActivity: 0, projectActivity: 2 }, trends: [{ date: "2026-09-19", taskCreated: 1, statusChanges: 1, completedStatusChanges: 1, assignmentActivity: 0, projectActivity: 2, totalActivity: 2 }], byTeam: [], byProject: [], noTeamActivity: 0 } });
});

describe("Workspace Insights", () => {
  it("renders current-state metrics, Team, and Project summaries", async () => {
    renderPage();
    expect(await screen.findByText("Workspace Insights")).toBeInTheDocument();
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Launch").length).toBeGreaterThan(1);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("2 open")).toBeInTheDocument();
  });

  it("refetches with Team and status filters", async () => {
    renderPage();
    await screen.findByText("Workspace Insights");
    const filters = screen.getAllByRole("combobox");
    fireEvent.change(filters[0], { target: { value: "team-a" } });
    await waitFor(() => expect(apiMock.getWorkspaceInsights.mock.calls.some(([filters]) => filters.teamId === "team-a")).toBe(true));
    const statusFilter = await waitFor(() => screen.getAllByRole("combobox").find((select) => Array.from((select as HTMLSelectElement).options).some((option) => option.value === "completed")));
    fireEvent.change(statusFilter!, { target: { value: "completed" } });
    await waitFor(() => {
      const found = apiMock.getWorkspaceInsights.mock.calls.some(([filters]) => filters.teamId === "team-a" && filters.status === "completed");
      if (!found) throw new Error(JSON.stringify(apiMock.getWorkspaceInsights.mock.calls));
    });
  });

  it("shows an error state when reporting is denied", async () => {
    apiMock.getWorkspaceInsights.mockRejectedValue(Object.assign(new Error("Forbidden"), { statusCode: 403 }));
    renderPage();
    expect(await screen.findByText("Insights unavailable")).toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
