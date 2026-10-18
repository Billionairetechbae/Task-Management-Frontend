import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ role: "owner", get: vi.fn(), capabilities: vi.fn(), update: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, activeCompanyId: "company-1" }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/lib/api", () => ({ api: { getWorkspaceGovernance: mocks.get, getWorkspaceGovernanceCapabilities: mocks.capabilities, updateWorkspaceGovernance: mocks.update } }));
import WorkspaceGovernance from "@/pages/WorkspaceGovernance";

const settings = { memberInvitePolicy: "existing_permissions", projectCreationPolicy: "existing_permissions", teamManagementPolicy: "existing_permissions", clientInvitePolicy: "existing_permissions", integrationManagementPolicy: "existing_permissions", googleDriveEnabled: true, dropboxEnabled: true, automationsEnabled: true, timeTrackingEnabled: true };
function view(role = "owner") { mocks.role = role; return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><WorkspaceGovernance /></QueryClientProvider>); }
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Workspace Governance", () => {
  it("denies member access to policy settings", () => {
    view("member");
    expect(screen.getByText(/owner or admin access is required/i)).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("loads grouped settings and confirms a high-impact disable before saving", async () => {
    mocks.get.mockResolvedValue({ data: { settings, teamLeadMemberManagement: { message: "Team Leads cannot manage Team members under current role permissions." } } });
    mocks.capabilities.mockResolvedValue({ data: { ...settings } });
    mocks.update.mockResolvedValue({ data: { settings: { ...settings, automationsEnabled: false }, teamLeadMemberManagement: { message: "Team Leads cannot manage Team members under current role permissions." } } });
    view();
    expect(await screen.findByRole("switch", { name: "Automations enabled" })).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Automations enabled" }));
    expect(await screen.findByRole("heading", { name: "Disable Automations enabled?" })).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ automationsEnabled: false }));
  });
});
