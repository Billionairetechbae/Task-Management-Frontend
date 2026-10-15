import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getAll: vi.fn(),
  updateTask: vi.fn(),
  getProjects: vi.fn(),
  listTeams: vi.fn(),
  auth: { user: { id: "me" }, activeCompanyId: "ws-1", workspaceRole: "member" as string },
  handlers: {} as Record<string, () => void>,
  toastError: vi.fn(),
  toastWarning: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: { getAllTasksCrossWorkspace: h.getAll, updateTask: h.updateTask, getProjects: h.getProjects, listTeams: h.listTeams } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/contexts/WebSocketContext", () => ({
  useWebSocket: () => ({ on: (e: string, fn: () => void) => { h.handlers[e] = fn; }, off: (e: string) => { delete h.handlers[e]; } }),
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/WorkspaceSwitcher", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: h.toastError, success: h.toastSuccess, warning: h.toastWarning } }));

import Board from "../pages/Board";

const task = (id: string, status: string, over: any = {}) => ({
  id, title: `Task ${id}`, status, priority: "medium", deadline: null, teamId: null, parentTaskId: null,
  creator: { id: "someone" }, assigneeId: "someone", assignees: [], ...over,
});

function Where() { return <div data-testid="where">{useLocation().pathname}</div>; }
function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/board"]}>
        <Routes><Route path="/board" element={<Board />} /><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
const resolved = (tasks: any[]) => ({ data: { tasks } });

beforeEach(() => {
  h.getAll.mockReset(); h.updateTask.mockReset(); h.toastError.mockReset(); h.toastWarning.mockReset(); h.toastSuccess.mockReset();
  h.getProjects.mockResolvedValue({ data: { projects: [{ id: "p1", name: "Finance" }] } });
  h.listTeams.mockResolvedValue({ data: { teams: [{ id: "team-1", name: "Operations" }] } });
  h.auth.workspaceRole = "member";
  for (const k of Object.keys(h.handlers)) delete h.handlers[k];
});

describe("Board page", () => {
  it("renders six status columns with tasks in the right one", async () => {
    h.getAll.mockResolvedValue(resolved([task("a", "pending"), task("b", "completed"), task("c", "cancelled")]));
    renderBoard();
    for (const label of ["Pending", "In Progress", "In Review", "Completed", "Delayed", "Cancelled"]) {
      expect(await screen.findByRole("region", { name: `${label} column` })).toBeInTheDocument();
    }
    expect(within(screen.getByRole("region", { name: "Pending column" })).getByText("Task a")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Completed column" })).getByText("Task b")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Cancelled column" })).getByText("Task c")).toBeInTheDocument();
  });

  it("sends project, team and search filters to the server", async () => {
    h.getAll.mockResolvedValue(resolved([]));
    renderBoard();
    await screen.findByRole("option", { name: "Finance" });
    await screen.findByRole("option", { name: "Operations" });
    await userEvent.selectOptions(screen.getByLabelText("Filter board by project"), "p1");
    await waitFor(() => expect(h.getAll.mock.calls.at(-1)![0].projectId).toBe("p1"));
    await userEvent.selectOptions(await screen.findByLabelText("Filter board by team"), "team-1");
    await waitFor(() => expect(h.getAll.mock.calls.at(-1)![0].teamId).toBe("team-1"));
    await userEvent.type(screen.getByLabelText("Search board tasks"), "rep");
    await waitFor(() => expect(h.getAll.mock.calls.at(-1)![0].search).toBe("rep"));
    expect(h.getAll.mock.calls.at(-1)![0].scope).toBe("workspace");
  });

  it("Move to uses the existing task PATCH with only the status", async () => {
    h.auth.workspaceRole = "manager";
    h.getAll.mockResolvedValue(resolved([task("a", "pending")]));
    h.updateTask.mockResolvedValue({});
    renderBoard();
    await userEvent.selectOptions(await screen.findByLabelText("Move Task a to"), "in_progress");
    await waitFor(() => expect(h.updateTask).toHaveBeenCalledWith("a", { status: "in_progress" }));
  });

  it("a failed move rolls the card back and reports the error", async () => {
    h.auth.workspaceRole = "manager";
    h.getAll.mockResolvedValueOnce(resolved([task("a", "pending")])).mockResolvedValue(resolved([task("a", "pending")]));
    h.updateTask.mockRejectedValue(new Error("Forbidden"));
    renderBoard();
    await userEvent.selectOptions(await screen.findByLabelText("Move Task a to"), "completed");
    await waitFor(() => expect(h.toastError).toHaveBeenCalled());
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Pending column" })).getByText("Task a")).toBeInTheDocument());
    expect(within(screen.getByRole("region", { name: "Completed column" })).queryByText("Task a")).toBeNull();
  });

  it("clicking a card opens the task", async () => {
    h.getAll.mockResolvedValue(resolved([task("a", "pending")]));
    renderBoard();
    await userEvent.click(await screen.findByRole("button", { name: "Task a" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/task-details/a");
  });

  it("hides the Move control for tasks the member cannot change", async () => {
    h.getAll.mockResolvedValue(resolved([task("a", "pending"), task("mine", "pending", { assigneeId: "me" })]));
    renderBoard();
    await screen.findByText("Task a");
    expect(screen.queryByLabelText("Move Task a to")).toBeNull();
    expect(screen.getByLabelText("Move Task mine to")).toBeInTheDocument();
  });

  it("refetches when a websocket task event arrives", async () => {
    h.getAll.mockResolvedValue(resolved([]));
    renderBoard();
    await waitFor(() => expect(h.getAll).toHaveBeenCalledTimes(1));
    h.handlers.task_updated();
    await waitFor(() => expect(h.getAll.mock.calls.length).toBeGreaterThan(1));
  });

  it("desktop layout is a fixed 3 x 2 grid; each lane has its own scroll area and the page does not scroll", async () => {
    h.getAll.mockResolvedValue(resolved([task("a", "pending")]));
    renderBoard();
    const grid = await screen.findByTestId("board-grid");
    expect(grid.className).toContain("xl:grid-cols-3");
    expect(grid.className).toContain("xl:grid-rows-2");
    expect(grid.className).toContain("xl:overflow-hidden");
    expect(grid.closest("main")!.className).toContain("overflow-hidden");
    const order = Array.from(grid.children).map((el) => el.getAttribute("data-testid"));
    expect(order).toEqual(["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"].map((s) => `board-panel-${s}`));
    for (const status of ["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"]) {
      const scroll = screen.getByTestId(`board-scroll-${status}`);
      expect(scroll.className).toContain("overflow-y-auto");
      expect(scroll.className).toContain("min-h-0");
      // lane header sits outside the scroll area, so it stays visible
      expect(scroll.previousElementSibling?.tagName).toBe("HEADER");
    }
  });

  it("falls back to swipeable lanes on mobile and two columns on tablet", async () => {
    h.getAll.mockResolvedValue(resolved([]));
    renderBoard();
    const grid = await screen.findByTestId("board-grid");
    expect(grid.className).toContain("overflow-x-auto");
    expect(grid.className).toContain("snap-x");
    expect(grid.className).toContain("md:grid-cols-2");
    expect(screen.getByTestId("board-panel-pending").className).toContain("w-[86vw]");
  });

  it("shows the lane count and a stronger overdue treatment", async () => {
    h.getAll.mockResolvedValue(resolved([task("late", "pending", { deadline: "2020-01-01T10:00:00.000Z" }), task("b", "pending")]));
    renderBoard();
    expect(await screen.findByLabelText("2 tasks")).toHaveTextContent("2");
    const late = screen.getByText("Task late").closest("article")!;
    expect(late.className).toContain("border-l-red-500");
    expect(within(late).getByText(/Overdue/)).toBeInTheDocument();
  });

  it("animates a move (leaving then settled) and still rolls back cleanly on failure", async () => {
    h.auth.workspaceRole = "manager";
    h.getAll.mockResolvedValue(resolved([task("a", "pending")]));
    h.updateTask.mockRejectedValue(new Error("nope"));
    renderBoard();
    await userEvent.selectOptions(await screen.findByLabelText("Move Task a to"), "completed");
    await waitFor(() => expect(screen.getByTestId("board-card").getAttribute("data-state")).toBe("leaving"));
    await waitFor(() => expect(h.toastError).toHaveBeenCalled());
    // rolled back into the original lane, animation state cleared afterwards
    await waitFor(() => expect(within(screen.getByTestId("board-panel-pending")).getByText("Task a")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("board-card").getAttribute("data-state")).toBe("idle"), { timeout: 2000 });
    expect(within(screen.getByTestId("board-panel-completed")).queryByText("Task a")).toBeNull();
  });

  it("shows a 'Blocked · N' badge on blocked cards only, and adds no Blocked column or Blocked-only filter", async () => {
    h.getAll.mockResolvedValue(resolved([
      task("a", "pending", { isBlocked: true, unresolvedDependencyCount: 2 }),
      task("b", "pending", { isBlocked: false, unresolvedDependencyCount: 0 }),
    ]));
    renderBoard();
    const blocked = (await screen.findByText("Task a")).closest("article")!;
    expect(within(blocked).getByTestId("blocked-badge")).toHaveTextContent("Blocked · 2");
    expect(within(screen.getByText("Task b").closest("article")!).queryByTestId("blocked-badge")).toBeNull();
    expect(screen.queryByRole("region", { name: /blocked column/i })).toBeNull();
    expect(screen.queryByLabelText(/blocked only/i)).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /blocked/i })).toBeNull();
  });

  it("moving a blocked task still succeeds and shows the advisory warning from the server", async () => {
    h.auth.workspaceRole = "manager";
    h.getAll.mockResolvedValue(resolved([task("a", "pending", { isBlocked: true, unresolvedDependencyCount: 2 })]));
    h.updateTask.mockResolvedValue({ status: "success", data: { task: {} }, warnings: [{ code: "BLOCKED_BY_INCOMPLETE_DEPENDENCIES", count: 2 }] });
    renderBoard();
    await userEvent.selectOptions(await screen.findByLabelText("Move Task a to"), "in_progress");
    await waitFor(() => expect(h.updateTask).toHaveBeenCalledWith("a", { status: "in_progress" }));
    await waitFor(() => expect(h.toastWarning).toHaveBeenCalledWith("Moved, but 2 dependencies are unfinished."));
    expect(h.toastSuccess).not.toHaveBeenCalled();
    expect(h.toastError).not.toHaveBeenCalled();
  });

  it("a normal move (no warnings) keeps the plain success toast", async () => {
    h.auth.workspaceRole = "manager";
    h.getAll.mockResolvedValue(resolved([task("a", "pending")]));
    h.updateTask.mockResolvedValue({ status: "success", data: { task: {} } });
    renderBoard();
    await userEvent.selectOptions(await screen.findByLabelText("Move Task a to"), "in_progress");
    await waitFor(() => expect(h.toastSuccess).toHaveBeenCalledWith("Task status updated"));
    expect(h.toastWarning).not.toHaveBeenCalled();
  });
});
