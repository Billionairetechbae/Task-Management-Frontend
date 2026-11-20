import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Teams from "@/pages/Teams";

const apiMock = vi.hoisted(() => ({
  listTeams: vi.fn(),
  getCompanyTeam: vi.fn(),
  getTeamEligibleMembers: vi.fn(),
  getTeamWorkspace: vi.fn(),
  getTasks: vi.fn(),
  assignTeamLead: vi.fn(),
  addTeamMembers: vi.fn(),
  removeTeamMembers: vi.fn(),
}));
const toastMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => ({
  activeCompanyId: "workspace-1",
  activeWorkspace: { id: "workspace-1", name: "Workspace One", role: "member" },
  workspaceRole: "member",
  user: { id: "lead-member-user", role: "team_member" },
}));
const permissionMock = vi.hoisted(() => ({ canManage: false }));

vi.mock("@/lib/api", () => ({ api: apiMock, ApiError: class ApiError extends Error {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/dashboard/DashboardComponents", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
  LoadingState: () => <div>Loading</div>,
}));
vi.mock("@/lib/permissions", () => ({ canManageWorkspace: () => permissionMock.canManage, canAdminWorkspace: () => permissionMock.canManage }));
vi.mock("@/lib/queryClient", () => ({ queryClient: { removeQueries: vi.fn() } }));

const companyMember = (id: string, firstName: string) => ({ id, userId: `${id}-user`, companyId: "workspace-1", role: "member", status: "active", isVerified: true, user: { id: `${id}-user`, firstName, lastName: "User", email: `${firstName.toLowerCase()}@test.invalid` } });
const link = (id: string, firstName: string) => ({ id: `link-${id}`, companyMemberId: id, teamId: "team-1", companyMember: companyMember(id, firstName) });

const team = () => ({
  id: "team-1", companyId: "workspace-1", name: "Marketing", description: "Campaigns", leadMemberId: "lead-member", createdBy: "owner", createdAt: "", updatedAt: "",
  leadMember: companyMember("lead-member", "Victoria"),
  memberLinks: [link("lead-member", "Victoria"), link("richard", "Richard")],
});

const renderTeams = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Teams /></MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  permissionMock.canManage = false;
  authMock.user = { id: "lead-member-user", role: "team_member" };
  apiMock.listTeams.mockResolvedValue({ data: { teams: [team()] } });
  apiMock.getCompanyTeam.mockResolvedValue({ data: { members: [] } });
  apiMock.getTeamEligibleMembers.mockResolvedValue({ data: { members: [companyMember("lead-member", "Victoria"), companyMember("richard", "Richard"), companyMember("sarah", "Sarah")] } });
  apiMock.getTeamWorkspace.mockResolvedValue({ data: { activeAssignments: [], workload: [], activity: [], messages: [] } });
  apiMock.getTasks.mockResolvedValue({ data: { tasks: [] } });
  apiMock.addTeamMembers.mockResolvedValue({ status: "success" });
  apiMock.removeTeamMembers.mockResolvedValue({ status: "success" });
});

describe("Team Lead membership management UI", () => {
  it("lets the designated Team Lead add an eligible workspace member without workspace-admin rights", async () => {
    const user = userEvent.setup();
    renderTeams();
    await screen.findByRole("heading", { name: "Marketing" });
    expect(screen.queryByRole("button", { name: "Edit team" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add members/i }));
    await waitFor(() => expect(apiMock.getTeamEligibleMembers).toHaveBeenCalledWith("team-1"));
    expect(apiMock.getCompanyTeam).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("checkbox", { name: "Add Sarah User" }));
    await user.click(screen.getByRole("button", { name: /add selected/i }));
    await waitFor(() => expect(apiMock.addTeamMembers).toHaveBeenCalledWith("team-1", ["sarah"]));
    expect(toastMock).toHaveBeenCalledWith({ title: "Members added" });
  });

  it("lets the Team Lead remove an ordinary member but never the Team Lead", async () => {
    const user = userEvent.setup();
    renderTeams();
    await screen.findByRole("heading", { name: "Marketing" });
    await user.click(screen.getByRole("button", { name: /add members/i }));

    expect(await screen.findByRole("checkbox", { name: "Remove Victoria User" })).toBeDisabled();
    await user.click(await screen.findByRole("checkbox", { name: "Remove Richard User" }));
    await user.click(screen.getByRole("button", { name: /remove selected/i }));
    await waitFor(() => expect(apiMock.removeTeamMembers).toHaveBeenCalledWith("team-1", ["richard"]));
  });

  it("shows the server's reason when a membership change is refused", async () => {
    const user = userEvent.setup();
    apiMock.addTeamMembers.mockRejectedValue(new Error("This action is restricted by your workspace governance settings."));
    renderTeams();
    await screen.findByRole("heading", { name: "Marketing" });
    await user.click(screen.getByRole("button", { name: /add members/i }));
    await user.click(await screen.findByRole("checkbox", { name: "Add Sarah User" }));
    await user.click(screen.getByRole("button", { name: /add selected/i }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Team update failed", description: "This action is restricted by your workspace governance settings.", variant: "destructive" })));
  });

  it("does not offer membership controls to an ordinary Team member", async () => {
    authMock.user = { id: "richard-user", role: "team_member" };
    renderTeams();
    await screen.findByRole("heading", { name: "Marketing" });
    expect(screen.queryByRole("button", { name: /add members/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit team" })).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "More Team actions" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).queryByText("Manage members")).not.toBeInTheDocument();
    expect(within(menu).getByText(/managed by workspace admins/i)).toBeInTheDocument();
    expect(apiMock.getTeamEligibleMembers).not.toHaveBeenCalled();
  });

  it("keeps Owner/Executive behaviour: they load the workspace directory, not the Team Lead endpoint", async () => {
    permissionMock.canManage = true;
    authMock.user = { id: "owner-user", role: "executive" };
    apiMock.getCompanyTeam.mockResolvedValue({ data: { members: [companyMember("sarah", "Sarah")] } });
    const user = userEvent.setup();
    renderTeams();
    await screen.findByRole("heading", { name: "Marketing" });
    expect(screen.getByRole("button", { name: "Edit team" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /add members/i }));
    await screen.findByRole("checkbox", { name: "Add Sarah User" });
    expect(apiMock.getCompanyTeam).toHaveBeenCalled();
    expect(apiMock.getTeamEligibleMembers).not.toHaveBeenCalled();
  });
});
