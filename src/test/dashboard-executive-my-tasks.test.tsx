import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ role: "member" as string, data: undefined as any, isError: false, canViewAll: true, getAllTasks: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "kv", firstName: "Kehinde", lastName: "Victor" }, workspaceRole: state.role, activeCompanyId: "w1", workspaces: [{ id: "w1" }], setActiveCompanyId: vi.fn(), refreshWorkspaces: vi.fn() }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: (key: string) => (key === "view_all_tasks" ? state.canViewAll : true) }) }));
vi.mock("@/hooks/useCoreQueries", () => ({
  useDashboardData: () => ({ data: state.data, isPending: false, isError: state.isError, isFetching: false, refetch: vi.fn() }),
  usePendingVerificationsQuery: () => ({ data: [], isPending: false }),
  useTaskCacheUpdater: () => ({ patchTaskEverywhere: vi.fn(), removeTaskEverywhere: vi.fn(), invalidateTasks: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/dashboard/TaskEditDrawer", () => ({ default: () => null }));
vi.mock("@/components/CreateTaskDialog", () => ({ default: () => null }));
vi.mock("@/components/InviteUserDialog", () => ({ default: () => null }));
vi.mock("@/components/workspaces/JoinRequestsPreview", () => ({ JoinRequestsPreview: () => null }));
vi.mock("@/pages/Board", () => ({
  default: ({ embeddedTasks }: any) => <div data-testid="dashboard-board">{embeddedTasks.map((task: any) => <article key={task.id}>{task.title}</article>)}</div>,
}));
vi.mock("@/lib/api", () => ({ api: { getAllTasksCrossWorkspace: state.getAllTasks } }));

import DashboardExecutive from "@/pages/DashboardExecutive";

const stat = (o: Record<string, number>) => ({ totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0, urgentTasks: 0, completionRate: 0, ...o });
const t = (id: string, status: string) => ({ id, title: id, status, priority: "medium", deadline: null, creator: { id: "kv" }, assignees: [] });
const mine = [t("Done A", "completed"), t("Done B", "completed"), t("Project Richie", "pending")];

describe("Dashboard personal task population", () => {
  beforeEach(() => {
    state.role = "member"; state.isError = false; state.canViewAll = true;
    state.data = {
      tasks: mine, myTasks: mine,
      teamStats: { totalAssistants: 0, availableAssistants: 0, pendingVerifications: 0, totalExecutives: 0 },
      taskStats: stat({ totalTasks: 3, completedTasks: 2, pendingTasks: 1, completionRate: 66.7 }),
      myStats: stat({ totalTasks: 3, completedTasks: 2, pendingTasks: 1, completionRate: 66.7 }),
    };
    state.getAllTasks.mockReset().mockImplementation(async ({ scope, page = 1, limit = 100 }: any) => {
      const tasks = scope === "assigned_workspace" ? state.data.myTasks : state.data.tasks;
      const pageTasks = tasks.slice((page - 1) * limit, page * limit);
      return { status: "success", results: pageTasks.length, total: tasks.length, data: { tasks: pageTasks } };
    });
  });
  const renderPage = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><DashboardExecutive /></MemoryRouter>
    </QueryClientProvider>
  );

  it("member sees the created-and-assigned-away task and 3 / 2 / 1 / 66.7%", async () => {
    renderPage();
    expect((await screen.findAllByText("Project Richie")).length).toBeGreaterThan(0);
    const stats = within(screen.getByTestId("dashboard-stats"));
    for (const label of ["My Tasks", "Completion Rate", "In Progress", "Overdue"]) expect(stats.getByText(label)).toBeInTheDocument();
    expect(stats.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getAllByText(/3 created by or assigned to you/).length).toBeGreaterThan(0);
  });

  it("an admin sees workspace totals by default and the personal population after choosing My Tasks", async () => {
    state.role = "admin";
    state.data = { ...state.data, tasks: [t("Other workspace task", "pending")], taskStats: stat({ totalTasks: 40, completedTasks: 25, completionRate: 62 }) };
    sessionStorage.clear();
    renderPage();
    const stats = within(screen.getByTestId("dashboard-stats"));
    expect(stats.getByText("Total Tasks")).toBeInTheDocument();
    expect(stats.getByText("40")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("tab", { name: "My Tasks" })[0]);
    expect((await screen.findAllByText("Project Richie")).length).toBeGreaterThan(0);
    expect(within(screen.getByTestId("dashboard-stats")).getByText("My Tasks")).toBeInTheDocument();
    expect(screen.queryByText("Other workspace task")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("dashboard-stats")).getByText("66.7%")).toBeInTheDocument();
  });

  it("empty personal population shows zeros without crashing", () => {
    state.data = { ...state.data, tasks: [], myTasks: [], taskStats: stat({}), myStats: stat({}) };
    renderPage();
    expect(within(screen.getByTestId("dashboard-stats")).getByText("0%")).toBeInTheDocument();
  });

  it("shows unavailable KPI values instead of valid-looking zeros when the dashboard request fails", async () => {
    state.role = "admin";
    state.data = undefined;
    state.isError = true;
    state.getAllTasks.mockResolvedValue({ status: "success", total: 0, data: { tasks: [] } });
    renderPage();

    const stats = within(screen.getByTestId("dashboard-stats"));
    expect(stats.getAllByText("—")).toHaveLength(4);
    expect(await screen.findAllByText("Member counts could not be loaded.")).not.toHaveLength(0);
    expect(stats.queryByText("0")).not.toBeInTheDocument();
  });

  it("loads every authorized task page for Dashboard Board and keeps scope and filters shared with List", async () => {
    state.role = "admin";
    state.data = { ...state.data, tasks: [], myTasks: [t("My task", "pending")] };
    const firstPage = Array.from({ length: 100 }, (_, index) => t(`Task ${index}`, "pending"));
    firstPage[0] = { ...firstPage[0], project: { id: "p1", name: "Finance" } };
    const secondPage = [t("Second page task", "pending")];
    state.data.tasks = [...firstPage, ...secondPage];
    renderPage();

    fireEvent.click(screen.getAllByRole("tab", { name: "All Tasks" })[0]);
    fireEvent.click(screen.getAllByRole("tab", { name: "Board" })[0]);
    expect((await screen.findAllByText("Second page task")).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("dashboard-board")[0].querySelectorAll("article")).toHaveLength(101);
    const workspaceCalls = state.getAllTasks.mock.calls.filter(([filters]) => filters.scope === "workspace");
    expect(workspaceCalls.map(([filters]) => filters.page)).toEqual([1, 2]);
    expect(screen.queryByText("Active workspace tasks by status")).toBeNull();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();

    await userEvent.selectOptions(screen.getAllByLabelText("Filter by project")[0], "p1");
    expect(screen.getAllByTestId("dashboard-board")[0].querySelectorAll("article")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("tab", { name: "List" })[0]);
    expect((await screen.findAllByText("Task 0")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Second page task")).toBeNull();
  });

  it("collapses the overview rail in Board mode and restores the preferred state in List mode", async () => {
    state.role = "owner";
    state.getAllTasks.mockResolvedValue({ status: "success", results: 1, total: 1, data: { tasks: [t("Owner task", "pending")] } });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Hide/ }));
    await waitFor(() => expect(screen.queryByText("Team Overview")).toBeNull());
    fireEvent.click(screen.getAllByRole("tab", { name: "Board" })[0]);
    await screen.findAllByTestId("dashboard-board");
    await waitFor(() => expect(screen.queryByText("Team Overview")).toBeNull());
    fireEvent.click(screen.getAllByRole("button", { name: "Show Overview" })[0]);
    await waitFor(() => expect(screen.getAllByText("Team Overview").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("tab", { name: "List" })[0]);
    await waitFor(() => expect(screen.queryByText("Team Overview")).toBeNull());
    fireEvent.click(screen.getAllByRole("button", { name: "Show Overview" })[0]);
    await waitFor(() => expect(screen.getAllByText("Team Overview").length).toBeGreaterThan(0));
  });
});
