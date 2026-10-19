import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Teams from "@/pages/Teams";

const apiMock = vi.hoisted(() => ({ listTeams: vi.fn(), getCompanyTeam: vi.fn(), getTeamWorkspace: vi.fn(), getTasks: vi.fn(), updateTask: vi.fn(), getTaskById: vi.fn() }));
const authMock = vi.hoisted(() => ({ activeCompanyId: "workspace-1", activeWorkspace: { id: "workspace-1", name: "W", role: "owner" }, workspaceRole: "owner", user: { id: "user-owner", role: "executive" } as { id: string; role: string }, refreshWorkspaces: vi.fn() }));
const toastSpy = vi.hoisted(() => vi.fn());
const sockets = vi.hoisted(() => ({ handlers: new Map<string, Set<() => void>>() }));
const permissions = vi.hoisted(() => ({ manage: true }));

vi.mock("@/lib/api", () => ({ api: apiMock, ApiError: class ApiError extends Error {} }));
vi.mock("@/components/tasks/SubtaskList", () => ({ default: () => null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ on: (e: string, h: () => void) => { (sockets.handlers.get(e) ?? sockets.handlers.set(e, new Set()).get(e)!).add(h); }, off: (e: string, h: () => void) => sockets.handlers.get(e)?.delete(h) }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastSpy }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/dashboard/DashboardComponents", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>, LoadingState: () => <div>Loading</div> }));
vi.mock("@/lib/permissions", () => ({ canManageWorkspace: () => permissions.manage, canAdminWorkspace: () => permissions.manage }));
vi.mock("@/lib/queryClient", () => ({ queryClient: { removeQueries: vi.fn() } }));


class E extends Error { statusCode: number; body: unknown; name = "ApiError"; constructor(s: number, code?: string) { super("x"); this.statusCode = s; this.body = code ? { code } : undefined; } }
const leadMember = { id: "lead-m", userId: "user-lead", companyId: "workspace-1", role: "member", status: "active", user: { id: "user-lead", firstName: "Lia", lastName: "Lead", email: "l@x.test" } };
const team = { id: "team-1", companyId: "workspace-1", name: "Marketing", description: "", leadMemberId: "lead-m", createdBy: "user-owner", createdAt: "", updatedAt: "", leadMember, memberLinks: [{ id: "l1", companyMemberId: "lead-m", teamId: "team-1", companyMember: leadMember }] };
const detail = (o: Record<string, unknown> = {}) => ({ status: "success", data: { task: { id: "t1", title: "Launch deck", description: "Slides", status: "completed", priority: "high", teamId: "team-1", companyId: "workspace-1", subtasks: [], comments: [], activities: [], assignees: [], ...o }, access: { canView: true, canEdit: true, readOnly: false } } });
const open = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/teams/team-1/tasks/t1"]}><Teams /></MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks(); permissions.manage = true;
  apiMock.listTeams.mockResolvedValue({ data: { teams: [team] } }); apiMock.getCompanyTeam.mockResolvedValue({ data: { members: [] } });
  apiMock.getTeamWorkspace.mockResolvedValue({ data: { team, messages: [], workload: [], activity: [], activeAssignments: [], tasks: [], taskCounts: {} } }); apiMock.getTasks.mockResolvedValue({ data: { tasks: [] } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Team task deep link /teams/:teamId/tasks/:taskId", () => {
  it("opens the task (even a completed one) using GET /tasks/:id with the right id", async () => {
    apiMock.getTaskById.mockResolvedValue(detail()); open();
    expect((await screen.findAllByText("Launch deck")).length).toBeGreaterThan(0); expect(apiMock.getTaskById).toHaveBeenCalledWith("t1");
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument();
  });

  it("a server failure is explained as such (with Try again that re-requests), not as 'task not available'", async () => {
    const user = userEvent.setup(); apiMock.getTaskById.mockRejectedValueOnce(new E(500, "TASK_LOAD_FAILED")).mockResolvedValueOnce(detail());
    open(); expect(await screen.findByTestId("task-load-error-server")).toBeInTheDocument(); expect(screen.queryByText("Team task not available")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i })); expect((await screen.findAllByText("Launch deck")).length).toBeGreaterThan(0); expect(apiMock.getTaskById).toHaveBeenCalledTimes(2);
  });

  it.each([[404, "TASK_NOT_FOUND", "not_found"], [403, "TASK_ACCESS_DENIED", "forbidden"], [423, "WORKSPACE_SUSPENDED", "suspended"]])("a %s response gets its own safe message", async (status, code, kind) => {
    apiMock.getTaskById.mockRejectedValue(new E(status as number, code as string)); open();
    expect(await screen.findByTestId(`task-load-error-${kind}`)).toBeInTheDocument(); expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("a task that is not in this Team is handled explicitly, with a way to open it elsewhere", async () => {
    apiMock.getTaskById.mockResolvedValue(detail({ teamId: "team-other" })); open();
    expect(await screen.findByTestId("task-not-in-team")).toBeInTheDocument(); expect(screen.getByRole("link", { name: /task workbench/i })).toHaveAttribute("href", expect.stringContaining("t1"));
  });
});
