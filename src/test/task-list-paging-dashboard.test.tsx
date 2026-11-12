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

describe("Dashboard task loading stops when the server's total over-reports (production incident)", () => {
  const real = [t("A", "pending"), t("B", "pending"), t("C", "completed")];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  beforeEach(() => {
    state.role = "owner"; state.isError = false; state.canViewAll = true;
    state.data = { tasks: real, myTasks: real, teamStats: { totalAssistants: 0, availableAssistants: 0, pendingVerifications: 0, totalExecutives: 0 }, taskStats: stat({ totalTasks: 3 }), myStats: stat({ totalTasks: 3 }) };
  });
  const renderPage = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><DashboardExecutive /></MemoryRouter>
    </QueryClientProvider>
  );

  it("3 real tasks but total=93 (joined rows counted): exactly ONE list request, and no more while the page stays open", async () => {
    // every page after the real tasks is empty, exactly like production
    state.getAllTasks.mockReset().mockImplementation(async ({ page = 1 }: { page?: number }) => ({ status: "success", results: page === 1 ? 3 : 0, total: 93, data: { tasks: page === 1 ? real : [] } }));
    renderPage();
    expect((await screen.findAllByText("A")).length).toBeGreaterThan(0);
    await sleep(700);
    expect(state.getAllTasks).toHaveBeenCalledTimes(1);
    await sleep(700);
    expect(state.getAllTasks).toHaveBeenCalledTimes(1); // idle: nothing more is requested
    expect(Math.max(...state.getAllTasks.mock.calls.map((c: { page?: number }[]) => c[0].page ?? 1))).toBe(1);
  });

  it("a population larger than one page is still loaded completely (150 real tasks, 100 per page)", async () => {
    const many = Array.from({ length: 150 }, (_, i) => t(`T${i}`, "pending"));
    state.data = { ...state.data, tasks: many, myTasks: many };
    state.getAllTasks.mockReset().mockImplementation(async ({ page = 1, limit = 100 }: { page?: number; limit?: number }) => ({ status: "success", total: 400, data: { tasks: many.slice((page - 1) * limit, page * limit) } }));
    renderPage();
    await waitFor(() => expect(state.getAllTasks).toHaveBeenCalledTimes(2));
    await sleep(600);
    expect(state.getAllTasks).toHaveBeenCalledTimes(2); // page 1 (100) + page 2 (50, short) and then it stops
  });
});
