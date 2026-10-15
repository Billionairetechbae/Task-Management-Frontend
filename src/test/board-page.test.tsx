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
}));

vi.mock("@/lib/api", () => ({ api: { getAllTasksCrossWorkspace: h.getAll, updateTask: h.updateTask, getProjects: h.getProjects, listTeams: h.listTeams } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/contexts/WebSocketContext", () => ({
  useWebSocket: () => ({ on: (e: string, fn: () => void) => { h.handlers[e] = fn; }, off: (e: string) => { delete h.handlers[e]; } }),
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/WorkspaceSwitcher", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: h.toastError, success: vi.fn() } }));

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
  h.getAll.mockReset(); h.updateTask.mockReset(); h.toastError.mockReset();
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
});
