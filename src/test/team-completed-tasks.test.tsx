import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Teams from "@/pages/Teams";
import { countTeamTasks, isTaskOverdue, mergeTeamTasks, taskMatchesView } from "@/lib/teamTaskViews";

const apiMock = vi.hoisted(() => ({ listTeams: vi.fn(), getCompanyTeam: vi.fn(), getTeamWorkspace: vi.fn(), getTasks: vi.fn(), updateTask: vi.fn() }));
const authMock = vi.hoisted(() => ({ activeCompanyId: "workspace-1", activeWorkspace: { id: "workspace-1", name: "W", role: "owner" }, workspaceRole: "owner", user: { id: "user-owner", role: "executive" } as { id: string; role: string }, refreshWorkspaces: vi.fn() }));
const toastSpy = vi.hoisted(() => vi.fn());
const sockets = vi.hoisted(() => ({ handlers: new Map<string, Set<() => void>>() }));
const permissions = vi.hoisted(() => ({ manage: true }));

vi.mock("@/lib/api", () => ({ api: apiMock, ApiError: class ApiError extends Error {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ on: (e: string, h: () => void) => { (sockets.handlers.get(e) ?? sockets.handlers.set(e, new Set()).get(e)!).add(h); }, off: (e: string, h: () => void) => sockets.handlers.get(e)?.delete(h) }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastSpy }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/dashboard/DashboardComponents", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>, LoadingState: () => <div>Loading</div> }));
vi.mock("@/lib/permissions", () => ({ canManageWorkspace: () => permissions.manage, canAdminWorkspace: () => permissions.manage }));
vi.mock("@/lib/queryClient", () => ({ queryClient: { removeQueries: vi.fn() } }));

const task = (id: string, title: string, status: string, extra: Record<string, unknown> = {}) => ({ id, title, status, priority: "medium", teamId: "team-1", companyId: "workspace-1", updatedAt: "2026-10-18T10:00:00Z", createdAt: "2026-10-01T10:00:00Z", ...extra });
const leadMember = { id: "lead-m", userId: "user-lead", companyId: "workspace-1", role: "member", status: "active", user: { id: "user-lead", firstName: "Lia", lastName: "Lead", email: "l@x.test" } };
const team = { id: "team-1", companyId: "workspace-1", name: "Marketing", description: "", leadMemberId: "lead-m", createdBy: "user-owner", createdAt: "", updatedAt: "", leadMember, memberLinks: [{ id: "l1", companyMemberId: "lead-m", teamId: "team-1", companyMember: leadMember }] };
const workspace = (tasks: unknown[], counts?: unknown, selectedTeam = team, workload: unknown[] = []) => ({ data: { team: selectedTeam, messages: [], workload, activity: [], activeAssignments: (tasks as { status: string }[]).filter((t) => !["completed", "cancelled"].includes(t.status)), tasks, taskCounts: counts } });

const open = (view = "tasks") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const app = () => <QueryClientProvider client={client}><MemoryRouter initialEntries={[`/teams?team=team-1&tab=${view}`]}><Teams /></MemoryRouter></QueryClientProvider>;
  const result = render(app());
  return { ...result, rerenderPage: () => result.rerender(app()) };
};
const rows = () => screen.getAllByRole("button", { name: /^Open task / }).map((b) => b.getAttribute("aria-label")!.replace("Open task ", ""));

beforeEach(() => {
  vi.clearAllMocks(); sockets.handlers.clear(); permissions.manage = true; authMock.activeCompanyId = "workspace-1"; authMock.user = { id: "user-owner", role: "executive" }; authMock.workspaceRole = "owner";
  apiMock.listTeams.mockResolvedValue({ data: { teams: [team] } }); apiMock.getCompanyTeam.mockResolvedValue({ data: { members: [] } });
  apiMock.getTeamWorkspace.mockReset().mockResolvedValue(workspace([], { all: 0, active: 0, completed: 0, overdue: 0 }));
  apiMock.getTasks.mockResolvedValue({ data: { tasks: [] } }); apiMock.updateTask.mockResolvedValue({ status: "success" });
});
afterEach(() => { vi.restoreAllMocks(); });

describe("view logic", () => {
  const T = [task("a", "A", "pending"), task("b", "B", "in_review"), task("c", "C", "completed"), task("d", "D", "cancelled"), task("e", "E", "in_progress", { deadline: "2020-01-01T00:00:00Z" }), task("f", "F", "completed", { deadline: "2020-01-01T00:00:00Z" })] as never[];
  it("All keeps every status; Active intentionally excludes completed and cancelled; Overdue ignores closed work", () => {
    expect(T.filter((t) => taskMatchesView(t, "all")).length).toBe(6);
    expect(T.filter((t) => taskMatchesView(t, "active")).map((t: { id: string }) => t.id)).toEqual(["a", "b", "e"]);
    expect(T.filter((t) => taskMatchesView(t, "completed")).map((t: { id: string }) => t.id)).toEqual(["c", "f"]);
    expect(T.filter((t) => taskMatchesView(t, "in_review")).length).toBe(1);
    expect(T.filter((t) => taskMatchesView(t, "overdue")).map((t: { id: string }) => t.id)).toEqual(["e"]);
  });
  it("counts come from the list, and the server's exact counts win when present", () => {
    expect(countTeamTasks(T)).toMatchObject({ all: 6, active: 3, in_review: 1, completed: 2, overdue: 1 });
    expect(countTeamTasks(T, { all: 400, completed: 150 })).toMatchObject({ all: 400, completed: 150, active: 3 });
  });
  it("uses an instant-based overdue boundary rather than a browser-local start-of-day boundary", () => {
    const now = new Date("2026-10-21T12:00:00.000Z");
    expect(isTaskOverdue({ status: "pending", deadline: "2026-10-21T11:59:59.999Z" }, now)).toBe(true);
    expect(isTaskOverdue({ status: "pending", deadline: now.toISOString() }, now)).toBe(false);
    expect(isTaskOverdue({ status: "completed", deadline: "2026-10-21T11:59:59.999Z" }, now)).toBe(false);
  });
  it("merging never drops a completed task that only one source has, and prefers the freshest copy", () => {
    const stale = task("x", "X", "in_progress", { updatedAt: "2026-10-18T09:00:00Z" }); const fresh = task("x", "X", "completed", { updatedAt: "2026-10-18T11:00:00Z" });
    const merged = mergeTeamTasks([stale] as never, [fresh] as never, [task("only", "Only", "completed")] as never);
    expect(merged.find((t) => t.id === "x")?.status).toBe("completed"); expect(merged.map((t) => t.id).sort()).toEqual(["only", "x"]);
    expect(mergeTeamTasks([{ ...task("s", "Sub", "pending"), parentTaskId: "p" }] as never)).toEqual([]);
  });

  it("uses the backend's exact team-level active count instead of the capped task list", async () => {
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([task("one", "One", "pending")], { all: 8, active: 6, completed: 2, cancelled: 0, in_review: 0, overdue: 0 }));
    open("overview");
    expect(await screen.findByText("Team workload")).toBeInTheDocument();
    expect(screen.getByText("6 active")).toBeInTheDocument();
  });
});

describe("Team workspace task list", () => {
  it("a completed Team task stays under All and Completed; Active excludes it on purpose; counts add up", async () => {
    const user = userEvent.setup();
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([task("t1", "Draft brief", "pending"), task("t2", "Launch deck", "completed")]));
    open(); await screen.findByText("Launch deck");
    expect(rows().sort()).toEqual(["Draft brief", "Launch deck"]);                          // All (default)
    expect(screen.getByTestId("team-view-all").textContent).toContain("2"); expect(screen.getByTestId("team-view-active").textContent).toContain("1"); expect(screen.getByTestId("team-view-completed").textContent).toContain("1");
    await user.click(screen.getByTestId("team-view-active")); expect(rows()).toEqual(["Draft brief"]);
    await user.click(screen.getByTestId("team-view-completed")); expect(rows()).toEqual(["Launch deck"]);
  });

  it("does not depend on the member-scoped /tasks response: workspace data carries completed work even when /tasks returns nothing or fails", async () => {
    apiMock.getTasks.mockRejectedValue(new Error("403"));
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([task("t2", "Launch deck", "completed")]));
    open(); expect(await screen.findByText("Launch deck")).toBeInTheDocument();
    expect(screen.getByTestId("team-view-completed").textContent).toContain("1");
  });

  it("marking complete persists the status, refetches, and (from Active) acknowledges where the task went", async () => {
    const user = userEvent.setup(); let completed = false;
    apiMock.getTeamWorkspace.mockImplementation(async () => workspace([task("t1", "Draft brief", completed ? "completed" : "pending")]));
    apiMock.updateTask.mockImplementation(async () => { completed = true; return { status: "success" }; });
    open(); await screen.findByText("Draft brief");
    await user.click(screen.getByTestId("team-view-active"));
    await user.click(screen.getByRole("button", { name: "Actions for Draft brief" })); await user.click(await screen.findByText("Mark complete"));
    await waitFor(() => expect(apiMock.updateTask).toHaveBeenCalledWith("t1", { status: "completed" }));
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "Task marked complete", description: expect.stringMatching(/Completed/), action: expect.anything() })));
    await waitFor(() => expect(screen.queryByText("Draft brief")).not.toBeInTheDocument());          // intentionally gone from Active
    await user.click(screen.getByTestId("team-view-completed")); expect(rows()).toEqual(["Draft brief"]);
    await user.click(screen.getByTestId("team-view-all")); expect(rows()).toEqual(["Draft brief"]);   // and still under All
    expect(screen.getByTestId("team-view-completed").textContent).toContain("1");
  });

  it("a refresh (fresh mount) still lists the completed task", async () => {
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([task("t2", "Launch deck", "completed")]));
    const first = open(); await screen.findByText("Launch deck"); first.unmount();
    open(); expect(await screen.findByText("Launch deck")).toBeInTheDocument();
  });

  it("an authorized user can reopen a completed task; a plain member cannot", async () => {
    const user = userEvent.setup();
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([task("t2", "Launch deck", "completed")]));
    open(); await screen.findByText("Launch deck");
    await user.click(screen.getByRole("button", { name: "Actions for Launch deck" })); await user.click(await screen.findByText("Reopen"));
    await waitFor(() => expect(apiMock.updateTask).toHaveBeenCalledWith("t2", { status: "in_progress" }));
  });

  it("a Team Lead without workspace management rights can reopen; a regular member sees the task but the action is disabled", async () => {
    const user = userEvent.setup(); permissions.manage = false; authMock.workspaceRole = "member";
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([task("t2", "Launch deck", "completed")]));
    authMock.user = { id: "user-lead", role: "team_member" };           // the Team's lead
    const lead = open(); await screen.findByText("Launch deck");
    await user.click(screen.getByRole("button", { name: "Actions for Launch deck" })); expect(await screen.findByText("Reopen")).not.toHaveAttribute("data-disabled");
    lead.unmount(); await user.keyboard("{Escape}");
    authMock.user = { id: "user-plain", role: "team_member" };           // a regular member
    open(); await screen.findByText("Launch deck");                       // visible
    await user.click(screen.getByRole("button", { name: "Actions for Launch deck" })); expect(await screen.findByText("Reopen")).toHaveAttribute("data-disabled");
  });

  it("a real-time task_updated event refetches and updates the task in place instead of removing it", async () => {
    let status = "in_progress";
    apiMock.getTeamWorkspace.mockImplementation(async () => workspace([task("t1", "Draft brief", status, { updatedAt: status === "completed" ? "2026-10-19T10:00:00Z" : "2026-10-18T10:00:00Z" })]));
    apiMock.getTasks.mockImplementation(async () => ({ data: { tasks: [task("t1", "Draft brief", status)] } }));
    open(); await screen.findByText("Draft brief"); expect(screen.getByTestId("team-view-completed").textContent).toContain("0");
    status = "completed"; await act(async () => { sockets.handlers.get("task_updated")?.forEach((h) => h()); });
    await waitFor(() => expect(screen.getByTestId("team-view-completed").textContent).toContain("1"));
    expect(rows()).toEqual(["Draft brief"]);
  });

  it("a task assigned to both a person and the Team is listed once and counted once", async () => {
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([task("t3", "Shared work", "completed", { assigneeId: "user-lead", assignee: { id: "user-lead", firstName: "Lia" } })]));
    apiMock.getTasks.mockResolvedValue({ data: { tasks: [task("t3", "Shared work", "completed", { assigneeId: "user-lead" })] } });
    open(); await screen.findByText("Shared work");
    expect(rows()).toEqual(["Shared work"]); expect(screen.getByTestId("team-view-all").textContent).toContain("1");
  });

  it("groups visible teams by authenticated active membership and preserves administrative controls", async () => {
    const user = userEvent.setup();
    const mine = {
      ...team,
      id: "team-2",
      name: "Product",
      memberLinks: [{ id: "m2", companyMemberId: "cm-owner", teamId: "team-2", companyMember: { id: "cm-owner", userId: "user-owner", status: "active", user: { id: "user-owner" } } }],
    };
    apiMock.listTeams.mockResolvedValue({ data: { teams: [team, mine] } });
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([], { all: 0, active: 0, completed: 0, overdue: 0 }, team));
    open("overview");
    expect(await screen.findByText("Team workload")).toBeInTheDocument();

    expect(screen.getByText("My Teams (1)")).toBeInTheDocument();
    expect(screen.getByText("Other Workspace Teams (1)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Product.*1 members/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: /Marketing.*1 members/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Create team" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Choose Team" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("My Teams (1)")).toBeInTheDocument();
    expect(within(menu).getByText("Other Workspace Teams (1)")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Product/ })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Marketing/ })).toBeInTheDocument();
  });

  it("does not keep previous workspace teams visible while a new workspace list is pending", async () => {
    const nextTeam = { ...team, id: "team-2", companyId: "workspace-2", name: "Product" };
    let release: (value: unknown) => void = () => {};
    apiMock.listTeams
      .mockResolvedValueOnce({ data: { teams: [team] } })
      .mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    apiMock.getTeamWorkspace.mockImplementation(async (id: string) => workspace([], { all: 0, active: 0, completed: 0, overdue: 0 }, id === "team-2" ? nextTeam : team));
    const page = open("overview");
    expect(await screen.findByText("Team workload")).toBeInTheDocument();

    authMock.activeCompanyId = "workspace-2";
    page.rerenderPage();
    await waitFor(() => expect(screen.queryByText("Marketing")).not.toBeInTheDocument());
    release({ data: { teams: [nextTeam] } });
    expect(await screen.findByRole("heading", { name: "Product" })).toBeInTheDocument();
    expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
  });

  it("shows a visible error instead of zeroed Team metrics when the workspace endpoint fails", async () => {
    apiMock.getTeamWorkspace.mockRejectedValue(new Error("workspace unavailable"));
    open("overview");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load Team statistics and workload");
    expect(screen.queryByText("Active tasks")).not.toBeInTheDocument();
  });

  it("keeps the responsive desktop sidebar and mobile Team chooser breakpoints", async () => {
    apiMock.getTeamWorkspace.mockResolvedValue(workspace([], { all: 0, active: 0, completed: 0, overdue: 0 }));
    open("overview");
    expect(await screen.findByText("Team workload")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Teams navigator" }).className).toContain("md:flex");
    expect(screen.getByRole("button", { name: "Choose Team" }).closest('[class*="md:hidden"]')).not.toBeNull();
  });

  it("does not grant access merely by listing another visible team", async () => {
    const user = userEvent.setup();
    const otherTeam = { ...team, id: "team-2", name: "Product" };
    permissions.manage = false;
    authMock.workspaceRole = "member";
    authMock.user = { id: "user-lead", role: "team_member" };
    apiMock.listTeams.mockResolvedValue({ data: { teams: [team, otherTeam] } });
    apiMock.getTeamWorkspace.mockImplementation(async (id: string) => {
      if (id === "team-2") throw new Error("forbidden");
      return workspace([], { all: 0, active: 0, completed: 0, overdue: 0 });
    });
    open("overview");
    expect(await screen.findByText("Team workload")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Product/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load Team statistics and workload");
  });
});
