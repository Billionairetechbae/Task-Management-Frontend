import { act, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: "owner" as string,
  workspace: { id: "w1", name: "Richie Tech" },
  dashboard: { data: undefined as any, isPending: false, isError: false },
  api: { getCompanyTeam: vi.fn() },
  invalidated: [] as string[],
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "kv", firstName: "K", lastName: "V" }, workspaceRole: state.role, activeCompanyId: state.workspace.id, activeWorkspace: state.workspace, workspaces: [{ id: "w1" }, { id: "w2" }], setActiveCompanyId: vi.fn(), refreshWorkspaces: vi.fn() }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ isLoading: false, canPerformRoleOperation: () => true }) }));
vi.mock("@/hooks/useCoreQueries", () => ({
  useDashboardData: () => ({ ...state.dashboard, isFetching: false, refetch: vi.fn() }),
  usePendingVerificationsQuery: () => ({ data: [], isPending: false }),
  useTaskCacheUpdater: () => ({ patchTaskEverywhere: vi.fn(), removeTaskEverywhere: vi.fn(), invalidateTasks: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/dashboard/TaskEditDrawer", () => ({ default: () => null }));
vi.mock("@/components/CreateTaskDialog", () => ({ default: () => null }));
vi.mock("@/components/InviteUserDialog", () => ({ default: () => null }));
vi.mock("@/components/workspaces/JoinRequestsPreview", () => ({ JoinRequestsPreview: () => null }));
vi.mock("@/lib/api", () => ({ api: state.api }));

import DashboardExecutive from "@/pages/DashboardExecutive";
import TeamDirectory from "@/pages/TeamDirectory";
import { websocketService } from "@/lib/websocket";
import { countByRole, isCountedMember } from "@/lib/membershipCounts";
import { useRealtimeCacheSync } from "@/hooks/useRealtimeCacheSync";

const person = (userId: string, role: string, firstName: string, extra: Record<string, unknown> = {}, userExtra: Record<string, unknown> = {}) => ({
  id: `m-${userId}`, userId, companyId: "w1", role, status: "active", isVerified: true, createdAt: "", updatedAt: "",
  user: { id: userId, firstName, lastName: "Person", email: `${firstName.toLowerCase()}@example.test`, isActive: true, ...userExtra }, ...extra,
}) as any;
// The production scenario: one Owner, one Manager, four Members ...
const six = [person("o", "owner", "Olu"), person("m1", "manager", "Mia"), person("u1", "member", "Uma"), person("u2", "member", "Uri"), person("u3", "member", "Ugo"), person("u4", "member", "Ula")];
// ... plus rows that must never count
const noise = [
  person("inv", "member", "Invited", { status: "invited" }), person("pen", "member", "Pending", { status: "pending" }), person("rem", "member", "Removed", { status: "removed" }),
  person("rej", "member", "Rejected", { status: "rejected" }), person("dorm", "member", "Dormant", {}, { isActive: false }), person("g", "guest", "Guest"), { ...six[2] },
];
const summary = (o: Record<string, unknown> = {}) => ({ workspaceMembers: 6, owners: 1, admins: 0, managers: 1, members: 4, guests: 1, pendingInvitations: 2, pendingJoinRequests: 3, ...o });
const teamStats = (membership: any) => ({ membership, totalAssistants: 0, availableAssistants: null, pendingVerifications: 0, totalExecutives: 0 });
const stats = { totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0, urgentTasks: 0, completionRate: 0 };

const renderDashboard = () => render(<MemoryRouter><DashboardExecutive /></MemoryRouter>);
const renderDirectory = () => render(<MemoryRouter><TeamDirectory /></MemoryRouter>);

describe("shared membership definition", () => {
  it("counts only active internal members with active accounts; duplicates and guests never inflate it", () => {
    expect(six.every(isCountedMember)).toBe(true);
    expect(noise.filter(isCountedMember).map((m) => m.userId)).toEqual(["u1"]); // only the duplicated real member
    expect(countByRole([...six, ...noise])).toEqual({ workspaceMembers: 6, owners: 1, admins: 0, managers: 1, members: 4 });
    expect(countByRole(undefined).workspaceMembers).toBe(0);
  });
});

describe("Dashboard Team Overview", () => {
  beforeEach(() => {
    state.role = "owner";
    state.dashboard = { data: { tasks: [], myTasks: [], taskStats: stats, myStats: stats, teamStats: teamStats(summary()) }, isPending: false, isError: false };
  });

  it("shows explicit, non-overlapping categories: 6 workspace members = 4 members + 1 manager + 1 owner/admin", () => {
    renderDashboard();
    const overview = within(screen.getAllByTestId("team-overview")[0]);
    expect(overview.getByTestId("count-workspace-members")).toHaveTextContent("6");
    expect(overview.getByTestId("count-members")).toHaveTextContent("4");
    expect(overview.getByTestId("count-managers")).toHaveTextContent("1");
    expect(overview.getByTestId("count-owners-admins")).toHaveTextContent("1");
    for (const label of ["Workspace Members", "Members", "Managers", "Owners & Admins", "Pending invitations", "Pending join requests"]) expect(overview.getByText(label)).toBeInTheDocument();
    expect(overview.getByTestId("count-pending-invitations")).toHaveTextContent("2");
    expect(overview.getByTestId("count-pending-join-requests")).toHaveTextContent("3");
  });

  it("no longer presents the unverifiable 'Available' or the ambiguous 'Executives' metrics", () => {
    renderDashboard();
    const overview = screen.getAllByTestId("team-overview")[0];
    expect(within(overview).queryByText("Available")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Executives")).not.toBeInTheDocument();
    expect(within(overview).queryByText("Team Members")).not.toBeInTheDocument();
  });

  it("join-request count appears only when the backend provides it (owners/admins); managers see everything else", () => {
    state.role = "manager";
    state.dashboard.data.teamStats = teamStats(summary({ pendingJoinRequests: null }));
    renderDashboard();
    const overview = within(screen.getAllByTestId("team-overview")[0]);
    expect(overview.queryByText("Pending join requests")).not.toBeInTheDocument();
    expect(overview.getByTestId("count-workspace-members")).toHaveTextContent("6");
  });

  it("an owner's join-request label links to the canonical review screen", () => {
    renderDashboard();
    expect(within(screen.getAllByTestId("team-overview")[0]).getByRole("link", { name: "Pending join requests" })).toHaveAttribute("href", "/settings/workspace/join-requests");
  });

  it("loading, error and older-backend (no summary) states are explicit and never show fake numbers", () => {
    state.dashboard = { data: undefined, isPending: true, isError: false };
    const loading = renderDashboard(); expect(screen.queryByTestId("team-overview")).not.toBeInTheDocument(); expect(screen.queryByTestId("count-workspace-members")).not.toBeInTheDocument(); loading.unmount();
    state.dashboard = { data: { tasks: [], myTasks: [], taskStats: stats, myStats: stats, teamStats: teamStats(null) }, isPending: false, isError: false };
    const old = renderDashboard(); expect(screen.getAllByText(/temporarily unavailable/).length).toBeGreaterThan(0); expect(screen.queryByTestId("count-workspace-members")).not.toBeInTheDocument(); old.unmount();
    state.dashboard = { data: undefined, isPending: false, isError: true };
    renderDashboard(); expect(screen.queryByTestId("count-workspace-members")).not.toBeInTheDocument();
  });

  it("zero-member summary (new workspace) renders zeros without crashing", () => {
    state.dashboard.data.teamStats = teamStats(summary({ workspaceMembers: 0, owners: 0, managers: 0, members: 0, pendingInvitations: 0, pendingJoinRequests: 0 }));
    renderDashboard();
    expect(within(screen.getAllByTestId("team-overview")[0]).getByTestId("count-workspace-members")).toHaveTextContent("0");
  });
});

describe("Company Directory reconciles with the Dashboard", () => {
  beforeEach(() => { state.workspace = { id: "w1", name: "Richie Tech" }; state.api.getCompanyTeam.mockReset().mockResolvedValue({ data: { members: [...six, ...noise] } }); });

  it("lists exactly the six people and reports the same totals the Dashboard shows (6 = 1 owner/admin + 1 manager + 4 members)", async () => {
    renderDirectory();
    const counts = await screen.findByTestId("directory-counts");
    expect(counts).toHaveTextContent("6 workspace members"); expect(counts).toHaveTextContent("1 owners & admins"); expect(counts).toHaveTextContent("1 managers"); expect(counts).toHaveTextContent("4 members");
    for (const name of ["Olu", "Mia", "Uma", "Uri", "Ugo", "Ula"]) expect(screen.getAllByText(new RegExp(`${name} Person`)).length).toBeGreaterThan(0);
    for (const name of ["Invited", "Pending", "Removed", "Rejected", "Dormant", "Guest"]) expect(screen.queryByText(new RegExp(`${name} Person`))).not.toBeInTheDocument();
    expect(screen.getAllByText(/Uma Person/).length).toBe(1); // a duplicated membership row still yields one card for one person
  });

  it("a membership event reloads the list: a role change updates the counts without a page refresh", async () => {
    renderDirectory();
    await screen.findByTestId("directory-counts");
    state.api.getCompanyTeam.mockResolvedValue({ data: { members: [...six.slice(0, 2), person("u1", "manager", "Uma"), ...six.slice(3)] } });
    await act(async () => { (websocketService as any).handleMessage({ type: "workspace_membership_changed", companyId: "w1" }); });
    await waitFor(() => expect(screen.getByTestId("directory-counts")).toHaveTextContent("2 managers"));
    expect(screen.getByTestId("directory-counts")).toHaveTextContent("3 members");
  });

  it("a membership event for ANOTHER workspace is ignored", async () => {
    renderDirectory();
    await screen.findByTestId("directory-counts");
    const calls = state.api.getCompanyTeam.mock.calls.length;
    await act(async () => { (websocketService as any).handleMessage({ type: "workspace_membership_changed", companyId: "w2" }); });
    await new Promise((r) => setTimeout(r, 30));
    expect(state.api.getCompanyTeam.mock.calls.length).toBe(calls);
  });

  it("switching workspace clears the previous workspace's people immediately (no stale or leaked list while loading)", async () => {
    const view = renderDirectory();
    await screen.findByTestId("directory-counts");
    expect(screen.getAllByText(/Olu Person/).length).toBeGreaterThan(0);
    let release: (v: unknown) => void = () => {};
    state.api.getCompanyTeam.mockReturnValue(new Promise((r) => { release = r; }));
    state.workspace = { id: "w2", name: "Other Co" };
    view.rerender(<MemoryRouter><TeamDirectory /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText(/Olu Person/)).not.toBeInTheDocument());
    expect(screen.queryByTestId("directory-counts")).not.toBeInTheDocument();
    release({ data: { members: [person("x", "owner", "Xena", { companyId: "w2" })] } });
    await waitFor(() => expect(screen.getByTestId("directory-counts")).toHaveTextContent("1 workspace members"));
    expect(screen.queryByText(/Olu Person/)).not.toBeInTheDocument();
  });

  it("an error shows an alert instead of zeros; an empty workspace shows 0", async () => {
    state.api.getCompanyTeam.mockRejectedValue(new Error("boom"));
    const failed = renderDirectory();
    expect(await screen.findByText(/member list could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByTestId("directory-counts")).not.toBeInTheDocument();
    failed.unmount();
    state.api.getCompanyTeam.mockResolvedValue({ data: { members: [] } });
    renderDirectory();
    expect(await screen.findByTestId("directory-counts")).toHaveTextContent("0 workspace members");
  });
});

describe("realtime cache sync for membership events", () => {
  it("membership and join-request events invalidate the dashboard and team caches", async () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    function Probe() { useRealtimeCacheSync(true); return null; }
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    await act(async () => { (websocketService as any).handleMessage({ type: "workspace_membership_changed", companyId: "w1" }); });
    const roots = spy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0]);
    expect(roots).toEqual(expect.arrayContaining(["dashboard", "team", "workspaceJoinRequests"]));
    spy.mockClear();
    await act(async () => { (websocketService as any).handleMessage({ type: "workspace_join_request_changed", companyId: "w1", status: "approved" }); });
    expect(spy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0])).toContain("dashboard");
  });
});
