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

const task = (id: string, status: string) => ({ id, title: `Task ${id}`, status, priority: "medium", deadline: null, teamId: null, parentTaskId: null, creator: { id: "someone" }, assigneeId: "someone", assignees: [] });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/board"]}><Routes><Route path="/board" element={<Board />} /></Routes></MemoryRouter></QueryClientProvider>);
  return { ...view, client };
}

describe("Board task loading stops when the server's total over-reports (production incident)", () => {
  beforeEach(() => { h.getAll.mockReset(); h.getProjects.mockResolvedValue({ data: { projects: [] } }); h.listTeams.mockResolvedValue({ data: { teams: [] } }); });

  it("4 real tasks but total=93: exactly ONE list request and none while idle", async () => {
    const real = [task("1", "pending"), task("2", "in_progress"), task("3", "completed"), task("4", "pending")];
    h.getAll.mockImplementation(async ({ page = 1 }: { page?: number }) => ({ status: "success", total: 93, data: { tasks: page === 1 ? real : [] } }));
    renderBoard();
    expect(await screen.findByText("Task 1")).toBeInTheDocument();
    await sleep(700);
    expect(h.getAll).toHaveBeenCalledTimes(1);
    await sleep(700);
    expect(h.getAll).toHaveBeenCalledTimes(1);
  });

  it("a realtime task event (cache invalidation) costs exactly one request - real-time updates still refetch, once", async () => {
    const real = [task("1", "pending"), task("2", "in_progress")];
    h.getAll.mockImplementation(async ({ page = 1 }: { page?: number }) => ({ status: "success", total: 93, data: { tasks: page === 1 ? real : [] } }));
    const { client } = renderBoard();
    expect(await screen.findByText("Task 1")).toBeInTheDocument();
    await sleep(300);
    expect(h.getAll).toHaveBeenCalledTimes(1);
    // what useRealtimeCacheSync does on task_updated
    await client.invalidateQueries({ queryKey: ["board-tasks"] });
    await sleep(500);
    expect(h.getAll).toHaveBeenCalledTimes(2);          // one refetch of the one page, not one per page ever requested
    await client.invalidateQueries({ queryKey: ["board-tasks"] });
    await sleep(500);
    expect(h.getAll).toHaveBeenCalledTimes(3);
  });

  it("a population larger than one page is loaded completely and then stops (120 tasks)", async () => {
    const many = Array.from({ length: 120 }, (_, i) => task(String(i), "pending"));
    h.getAll.mockImplementation(async ({ page = 1, limit = 100 }: { page?: number; limit?: number }) => ({ status: "success", total: 500, data: { tasks: many.slice((page - 1) * limit, page * limit) } }));
    renderBoard();
    await waitFor(() => expect(h.getAll).toHaveBeenCalledTimes(2));
    await sleep(600);
    expect(h.getAll).toHaveBeenCalledTimes(2);
  });
});
