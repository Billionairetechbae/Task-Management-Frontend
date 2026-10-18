import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "owner" as string | null,
  api: {
    listConnectedStorageConnections: vi.fn(), startDropboxConnection: vi.fn(), reconnectConnectedStorage: vi.fn(), disconnectConnectedStorage: vi.fn(),
    listIntegrations: vi.fn(), getWhatsAppAccount: vi.fn(), listIntegrationActivity: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
  google: { isConnected: false, status: { connected: false }, connectLoading: false, disconnectLoading: false, connect: vi.fn(), disconnect: vi.fn(), refresh: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, user: { id: "u1" } }) }));
vi.mock("@/hooks/use-google-integration", () => ({ default: () => ({ data: { connected: false } }) }));
vi.mock("@/hooks/useGoogleIntegration", () => ({ useGoogleIntegration: () => mocks.google }));
vi.mock("@/hooks/useWorkspaceGovernance", () => ({ useWorkspaceGovernance: () => ({ capabilities: { googleDriveEnabled: true, dropboxEnabled: true, automationsEnabled: true, timeTrackingEnabled: true, memberInvitesRestricted: false, projectCreationRestricted: false, teamManagementRestricted: false, clientInvitesRestricted: false, integrationManagementRestricted: false }, settings: undefined, permitted: true, isLoading: false }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/integrations/WhatsAppSettings", () => ({ WhatsAppSettings: () => null }));

import { ConnectedStorageSettings } from "@/components/integrations/ConnectedStorageSettings";
import Integrations from "@/pages/Integrations";

const connection = (extra: Record<string, unknown> = {}) => ({
  id: "conn-1", provider: "dropbox", status: "active", lastVerifiedAt: null, connectedAt: "2026-10-20T10:00:00Z", disconnectedAt: null,
  account: { name: "Ada Lovelace", email: "ada@example.test" }, scopes: [], ...extra,
});
const respond = (canManage: boolean, connections: unknown[]) => mocks.api.listConnectedStorageConnections.mockResolvedValue({ status: "success", data: { canManage, connections } });

describe("Workspace Connected Storage settings", () => {
  const assign = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.role = "owner";
    Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, assign, href: "http://localhost:3000/settings?tab=integrations" } });
  });

  it("owner sees the connected Dropbox account with Disconnect, and no Connect button", async () => {
    respond(true, [connection()]);
    render(<ConnectedStorageSettings />);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByTestId("dropbox-account")).toHaveTextContent("Ada Lovelace · ada@example.test");
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect dropbox/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reconnect" })).not.toBeInTheDocument();
  });

  it("clearly separates workspace storage from personal integrations", async () => {
    respond(true, []);
    render(<ConnectedStorageSettings />);
    expect(await screen.findByRole("heading", { name: "Workspace Connected Storage" })).toBeInTheDocument();
    expect(screen.getByText(/separate from the personal integrations/i)).toBeInTheDocument();
  });

  it("disconnected workspace: Connect Dropbox starts OAuth through the backend and redirects to the returned URL", async () => {
    respond(true, []);
    mocks.api.startDropboxConnection.mockResolvedValue({ status: "success", data: { authorizationUrl: "https://www.dropbox.com/oauth2/authorize?state=abc" } });
    render(<ConnectedStorageSettings />);
    expect(await screen.findByText("Disconnected")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /connect dropbox/i }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://www.dropbox.com/oauth2/authorize?state=abc"));
    expect(mocks.api.startDropboxConnection).toHaveBeenCalledTimes(1);
  });

  it("a previously disconnected record still offers Connect (not Disconnect/Reconnect)", async () => {
    respond(true, [connection({ status: "disconnected", disconnectedAt: "2026-10-21T00:00:00Z" })]);
    render(<ConnectedStorageSettings />);
    expect(await screen.findByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect dropbox/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument();
  });

  it("reauth required: shows the warning and an explicit Reconnect that uses the reconnect endpoint", async () => {
    respond(true, [connection({ status: "reauth_required" })]);
    mocks.api.reconnectConnectedStorage.mockResolvedValue({ status: "success", data: { authorizationUrl: "https://www.dropbox.com/oauth2/authorize?state=re" } });
    render(<ConnectedStorageSettings />);
    expect(await screen.findByText("Reconnect required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect dropbox/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://www.dropbox.com/oauth2/authorize?state=re"));
    expect(mocks.api.reconnectConnectedStorage).toHaveBeenCalledWith("conn-1");
    expect(mocks.api.startDropboxConnection).not.toHaveBeenCalled();
  });

  it("disconnect requires confirmation and cancelling does nothing", async () => {
    respond(true, [connection()]);
    mocks.api.disconnectConnectedStorage.mockResolvedValue({ status: "success", message: "Dropbox disconnected.", data: { providerRevoked: true } });
    render(<ConnectedStorageSettings />);
    await userEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/nothing is deleted from dropbox/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(mocks.api.disconnectConnectedStorage).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    respond(true, [connection({ status: "disconnected" })]);
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Disconnect" }));
    await waitFor(() => expect(mocks.api.disconnectConnectedStorage).toHaveBeenCalledWith("conn-1"));
    expect(await screen.findByText("Disconnected")).toBeInTheDocument();
    expect(mocks.toast.success).toHaveBeenCalledWith("Dropbox disconnected.");
  });

  it.each(["manager", "member"])("%s sees availability only: no credential controls and no account identity", async (role) => {
    mocks.role = role;
    respond(false, [{ id: "conn-1", provider: "dropbox", status: "active", lastVerifiedAt: null, connectedAt: null, disconnectedAt: null }]);
    render(<ConnectedStorageSettings />);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText(/available for attaching files/i)).toBeInTheDocument();
    for (const name of [/connect dropbox/i, /^reconnect$/i, /^disconnect$/i]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(screen.queryByTestId("dropbox-account")).not.toBeInTheDocument();
  });

  it("an admin role without backend manage rights (stale UI) still gets no controls", async () => {
    mocks.role = "admin";
    respond(false, []);
    render(<ConnectedStorageSettings />);
    await screen.findByText("Disconnected");
    expect(screen.queryByRole("button", { name: /connect dropbox/i })).not.toBeInTheDocument();
  });

  it.each(["guest", null])("client/external (%s) sees nothing and the API is never called", async (role) => {
    mocks.role = role;
    const { container } = render(<ConnectedStorageSettings />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(mocks.api.listConnectedStorageConnections).not.toHaveBeenCalled();
  });

  it("reports the redirect result once and cleans the URL; failures show a safe message", async () => {
    respond(true, []);
    const replace = vi.spyOn(window.history, "replaceState").mockImplementation(() => undefined);
    window.location.href = "http://localhost:3000/settings?tab=integrations&connected_storage=error&code=account_mismatch";
    render(<ConnectedStorageSettings />);
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Dropbox was not connected", expect.objectContaining({ description: expect.stringMatching(/different Dropbox account/) })));
    expect(replace).toHaveBeenCalled();
    expect(String(replace.mock.calls[0][2])).not.toMatch(/connected_storage|code=/);
    replace.mockRestore();
  });

  it("start failure surfaces a toast and does not redirect", async () => {
    respond(true, []);
    mocks.api.startDropboxConnection.mockRejectedValue(new Error("A Dropbox connection already exists for this workspace."));
    render(<ConnectedStorageSettings />);
    await userEvent.click(await screen.findByRole("button", { name: /connect dropbox/i }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Could not start Dropbox connection", expect.objectContaining({ description: expect.stringMatching(/already exists/) })));
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("existing personal Google integration page is unchanged", () => {
  it("still renders the Google integration card alongside the new workspace section", async () => {
    mocks.role = "owner";
    respond(true, []);
    mocks.api.listIntegrations.mockResolvedValue({ data: { integrations: [{ id: "google", name: "Google", available: true, connected: false }] } });
    mocks.api.getWhatsAppAccount.mockResolvedValue({ data: { connected: false } });
    mocks.api.listIntegrationActivity.mockResolvedValue({ data: [] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><Integrations embedded /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("Google")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Workspace Connected Storage" })).toBeInTheDocument();
    expect(mocks.api.listIntegrations).toHaveBeenCalled();
  });
});
