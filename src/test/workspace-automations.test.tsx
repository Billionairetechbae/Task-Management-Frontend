import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ role: "owner", get: vi.fn(), capabilities: vi.fn(), create: vi.fn(), toggle: vi.fn(), archive: vi.fn(), history: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, activeCompanyId: "company-1" }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/lib/api", () => ({ api: { getWorkspaceGovernanceCapabilities: mocks.capabilities, getWorkspaceGovernance: vi.fn(), getAutomations: mocks.get, createAutomation: mocks.create, setAutomationEnabled: mocks.toggle, archiveAutomation: mocks.archive, getAutomationExecutions: mocks.history } }));
import WorkspaceAutomations from "@/pages/WorkspaceAutomations";

const wrap = (role = "owner") => { mocks.role = role; return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><WorkspaceAutomations/></QueryClientProvider>); };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("workspace automations", () => {
  it("denies members from managing workspace rules", () => {
    wrap("member");
    expect(screen.getByText(/owner or admin access is required/)).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("shows administrator disabled messaging and hides creation when Automations are disabled", async () => {
    mocks.capabilities.mockResolvedValue({ data: { automationsEnabled: false, timeTrackingEnabled: true, dropboxEnabled: true, googleDriveEnabled: true } });
    mocks.get.mockResolvedValue({ data: { automations: [] } });
    wrap();
    expect(await screen.findByRole("status")).toHaveTextContent("Automations are disabled by your workspace administrator.");
    expect(screen.queryByRole("button", { name: "Create automation" })).not.toBeInTheDocument();
  });

  it("opens the guided rule builder from a preset and requires review before saving", async () => {
    mocks.get.mockResolvedValue({ data: { automations: [] } });
    mocks.create.mockResolvedValue({ data: { automation: { id: "a1" } } });
    wrap();
    fireEvent.click(await screen.findByRole("button", { name: /Notify owner when Task completes/i }));
    expect(screen.getByDisplayValue("Notify owner when Task completes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review automation" }));
    expect(screen.getByLabelText("Automation review")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Enable automation" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, triggerType: "task_completed", actionType: "SEND_ADMIINO_NOTIFICATION", actionConfig: { recipientType: "project_owner" } })));
  });
});
