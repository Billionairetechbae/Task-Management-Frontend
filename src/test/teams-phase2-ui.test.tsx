import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Teams from "@/pages/Teams";
import WorkspaceLifecycleSettings from "@/components/workspaces/WorkspaceLifecycleSettings";

const apiMock = vi.hoisted(() => ({
  listTeams: vi.fn(),
  getCompanyTeam: vi.fn(),
  assignTeamLead: vi.fn(),
  removeTeamMemberFromTeam: vi.fn(),
  getLeaveRequirements: vi.fn(),
  leaveWorkspace: vi.fn(),
  getMyWorkspaces: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  activeCompanyId: "workspace-1",
  activeWorkspace: { id: "workspace-1", name: "Workspace One", role: "owner" },
  workspaceRole: "owner",
  user: { id: "user-owner", role: "executive" },
  refreshWorkspaces: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/api", () => ({ api: apiMock, ApiError: class ApiError extends Error { statusCode = 409; } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/dashboard/DashboardComponents", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
  LoadingState: () => <div>Loading</div>,
}));
vi.mock("@/lib/permissions", () => ({ canManageWorkspace: () => true, canAdminWorkspace: () => true }));
vi.mock("@/lib/queryClient", () => ({ queryClient: { removeQueries: vi.fn() } }));

const member = (id: string, firstName: string) => ({
  id,
  companyMemberId: id,
  teamId: "team-1",
  companyMember: { id, userId: `${id}-user`, companyId: "workspace-1", role: "member", status: "active", isVerified: true, user: { id: `${id}-user`, firstName, lastName: "User", email: `${firstName.toLowerCase()}@test.invalid` } },
});

const team = () => {
  const lead = member("lead-member", "Victoria");
  return {
    id: "team-1", companyId: "workspace-1", name: "Marketing", description: "Campaigns", leadMemberId: lead.companyMemberId, createdBy: "user-owner", createdAt: "", updatedAt: "",
    leadMember: lead.companyMember,
    memberLinks: [lead, member("replacement-member", "Richard"), member("third-member", "Sarah")],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.listTeams.mockResolvedValue({ data: { teams: [team()] } });
  apiMock.getCompanyTeam.mockResolvedValue({ data: { members: [] } });
  apiMock.assignTeamLead.mockResolvedValue({ status: "success" });
  apiMock.removeTeamMemberFromTeam.mockResolvedValue({ status: "success" });
  apiMock.getLeaveRequirements.mockResolvedValue({ data: { teams: [] } });
  apiMock.leaveWorkspace.mockResolvedValue({ status: "success" });
});

afterEach(() => { vi.restoreAllMocks(); });

describe("Teams leadership handover UI", () => {
  it("renders Change Lead, supports cancellation, and confirms a lead transfer", async () => {
    const user = userEvent.setup();
    render(<Teams />);
    await screen.findByRole("heading", { name: "Marketing" });
    await user.click(screen.getByRole("button", { name: /change lead/i }));
    expect(screen.getByText(/Team Lead status does not grant Workspace Admin/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Confirm lead change")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /change lead/i }));
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Richard User" }));
    await user.click(screen.getByRole("button", { name: /confirm lead change/i }));
    await waitFor(() => expect(apiMock.assignTeamLead).toHaveBeenCalledWith("team-1", "replacement-member", expect.objectContaining({ confirmTransfer: true, expectedCurrentLeadMemberId: "lead-member" })));
  });

  it("opens replacement selection for current-lead removal and atomically submits handover", async () => {
    const user = userEvent.setup();
    render(<Teams />);
    await screen.findByRole("heading", { name: "Marketing" });
    await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    expect(screen.getByRole("heading", { name: /handover before removing lead/i })).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Richard User" }));
    await user.click(screen.getByRole("button", { name: /confirm handover and remove/i }));
    await waitFor(() => expect(apiMock.removeTeamMemberFromTeam).toHaveBeenCalledWith("team-1", "lead-member", expect.objectContaining({ replacementCompanyMemberId: "replacement-member", confirmTransfer: true, expectedCurrentLeadMemberId: "lead-member" })));
  });
});

describe("Workspace leave leadership handover UI", () => {
  it("requires replacements for multiple lead teams before leaving", async () => {
    const user = userEvent.setup();
    apiMock.getLeaveRequirements.mockResolvedValue({ data: { teams: [{ id: "team-1", name: "Marketing", currentLeadMemberId: "lead-1" }, { id: "team-2", name: "Operations", currentLeadMemberId: "lead-1" }] } });
    apiMock.getCompanyTeam.mockResolvedValue({ data: { members: [{ id: "replacement-1", userId: "replacement-user", companyId: "workspace-1", role: "member", status: "active", isVerified: true, user: { id: "replacement-user", firstName: "Richard", lastName: "User", email: "richard@test.invalid" } }] } });
    render(<MemoryRouter><WorkspaceLifecycleSettings /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Leave workspace" }));
    expect(await screen.findByText(/currently lead these teams/i)).toBeInTheDocument();
    const selectors = screen.getAllByRole("combobox");
    expect(selectors).toHaveLength(2);
    expect(screen.getByRole("button", { name: /transfer ownership and leave/i })).toBeDisabled();
    fireEvent.change(selectors[0], { target: { value: "replacement-1" } });
    fireEvent.change(selectors[1], { target: { value: "replacement-1" } });
    await user.click(screen.getByRole("button", { name: /Richard User richard@test.invalid/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /transfer ownership and leave/i }));
    await waitFor(() => expect(apiMock.leaveWorkspace).toHaveBeenCalledWith("workspace-1", expect.objectContaining({ teamLeadHandovers: [{ teamId: "team-1", replacementCompanyMemberId: "replacement-1" }, { teamId: "team-2", replacementCompanyMemberId: "replacement-1" }] })));
  });
});
