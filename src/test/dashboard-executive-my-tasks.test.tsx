import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ role: "member" as string, data: undefined as any, canViewAll: true }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "kv", firstName: "Kehinde", lastName: "Victor" }, workspaceRole: state.role, activeCompanyId: "w1", workspaces: [{ id: "w1" }], setActiveCompanyId: vi.fn(), refreshWorkspaces: vi.fn() }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: (key: string) => (key === "view_all_tasks" ? state.canViewAll : true) }) }));
vi.mock("@/hooks/useCoreQueries", () => ({
  useDashboardData: () => ({ data: state.data, isPending: false, isFetching: false, refetch: vi.fn() }),
  usePendingVerificationsQuery: () => ({ data: [], isPending: false }),
  useTaskCacheUpdater: () => ({ patchTaskEverywhere: vi.fn(), removeTaskEverywhere: vi.fn(), invalidateTasks: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/dashboard/TaskEditDrawer", () => ({ default: () => null }));
vi.mock("@/components/CreateTaskDialog", () => ({ default: () => null }));
vi.mock("@/components/InviteUserDialog", () => ({ default: () => null }));
vi.mock("@/components/workspaces/JoinRequestsPreview", () => ({ JoinRequestsPreview: () => null }));
vi.mock("@/lib/api", () => ({ api: {} }));

import DashboardExecutive from "@/pages/DashboardExecutive";

const stat = (o: Record<string, number>) => ({ totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0, urgentTasks: 0, completionRate: 0, ...o });
const t = (id: string, status: string) => ({ id, title: id, status, priority: "medium", deadline: null, creator: { id: "kv" }, assignees: [] });
const mine = [t("Done A", "completed"), t("Done B", "completed"), t("Project Richie", "pending")];

describe("Dashboard personal task population", () => {
  beforeEach(() => {
    state.role = "member"; state.canViewAll = true;
    state.data = {
      tasks: mine, myTasks: mine,
      teamStats: { totalAssistants: 0, availableAssistants: 0, pendingVerifications: 0, totalExecutives: 0 },
      taskStats: stat({ totalTasks: 3, completedTasks: 2, pendingTasks: 1, completionRate: 66.7 }),
      myStats: stat({ totalTasks: 3, completedTasks: 2, pendingTasks: 1, completionRate: 66.7 }),
    };
  });
  const renderPage = () => render(<MemoryRouter><DashboardExecutive /></MemoryRouter>);

  it("member sees the created-and-assigned-away task and 3 / 2 / 1 / 66.7%", () => {
    renderPage();
    expect(screen.getAllByText("Project Richie").length).toBeGreaterThan(0);
    const stats = within(screen.getByTestId("dashboard-stats"));
    for (const label of ["My Tasks", "Completion Rate", "My Pending", "My In Progress", "My Completed", "My Overdue"]) expect(stats.getByText(label)).toBeInTheDocument();
    expect(stats.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getAllByText(/3 created by or assigned to you/).length).toBeGreaterThan(0);
  });

  it("an admin sees workspace totals by default and the personal population after choosing My Tasks", () => {
    state.role = "admin";
    state.data = { ...state.data, tasks: [t("Other workspace task", "pending")], taskStats: stat({ totalTasks: 40, completedTasks: 25, completionRate: 62 }) };
    sessionStorage.clear();
    renderPage();
    const stats = within(screen.getByTestId("dashboard-stats"));
    expect(stats.getByText("Total Tasks")).toBeInTheDocument();
    expect(stats.getByText("40")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("tab", { name: "My Tasks" })[0]);
    expect(within(screen.getByTestId("dashboard-stats")).getByText("My Tasks")).toBeInTheDocument();
    expect(screen.getAllByText("Project Richie").length).toBeGreaterThan(0);
    expect(screen.queryByText("Other workspace task")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("dashboard-stats")).getByText("66.7%")).toBeInTheDocument();
  });

  it("empty personal population shows zeros without crashing", () => {
    state.data = { ...state.data, tasks: [], myTasks: [], taskStats: stat({}), myStats: stat({}) };
    renderPage();
    expect(within(screen.getByTestId("dashboard-stats")).getByText("0%")).toBeInTheDocument();
  });
});
