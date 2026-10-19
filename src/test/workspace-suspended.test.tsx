import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth.value }));
vi.mock("@/components/support/SupportLauncher", () => ({ default: () => <div data-testid="support-launcher" /> }));

import WorkspaceSuspended from "@/pages/WorkspaceSuspended";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ApiError, api } from "@/lib/api";

const base = () => ({ suspendedWorkspace: { id: "w1", name: "Acme Ltd", reference: "WS-ABCD1234" }, workspaces: [{ id: "w1", name: "Acme Ltd", role: "owner", status: "active" }, { id: "w2", name: "Beta Co", role: "member", status: "active" }], setActiveCompanyId: vi.fn(), clearSuspendedWorkspace: vi.fn(), logout: vi.fn(), user: { id: "u1", role: "executive" }, loading: false });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("suspended workspace experience", () => {
  it("explains the state, shows only the workspace name and support reference, and never an internal reason", () => {
    auth.value = base(); render(<MemoryRouter><WorkspaceSuspended /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "This workspace is temporarily suspended." })).toBeInTheDocument();
    expect(screen.getByText(/Your workspace data has been retained/)).toBeInTheDocument(); expect(screen.getByText("Acme Ltd")).toBeInTheDocument(); expect(screen.getByText("WS-ABCD1234")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/payment|security|policy|billing|investigation|reason/i);
  });
  it("offers only OTHER live workspaces to switch to, and switching clears the suspended state", () => {
    const ctx = base(); auth.value = ctx; render(<MemoryRouter><WorkspaceSuspended /></MemoryRouter>);
    const region = screen.getByRole("region", { name: "Switch workspace" }); expect(region).toHaveTextContent("Beta Co"); expect(region).not.toHaveTextContent("Acme Ltd");
    fireEvent.click(screen.getByRole("button", { name: "Beta Co" })); expect(ctx.setActiveCompanyId).toHaveBeenCalledWith("w2"); expect(ctx.clearSuspendedWorkspace).toHaveBeenCalled();
  });
  it("hides the switcher when there is no other workspace, but Support and Sign out stay available", () => {
    const ctx = { ...base(), workspaces: [] }; auth.value = ctx; render(<MemoryRouter><WorkspaceSuspended /></MemoryRouter>);
    expect(screen.queryByRole("region", { name: "Switch workspace" })).not.toBeInTheDocument();
    const opened = vi.fn(); window.addEventListener("support:open", opened); fireEvent.click(screen.getByRole("button", { name: /Contact Support/ })); expect(opened).toHaveBeenCalled(); window.removeEventListener("support:open", opened);
    fireEvent.click(screen.getByRole("button", { name: /Sign out/ })); expect(ctx.logout).toHaveBeenCalled(); expect(screen.getByTestId("support-launcher")).toBeInTheDocument();
  });
  it("renders nothing when no workspace is suspended", () => { auth.value = { ...base(), suspendedWorkspace: null }; const { container } = render(<MemoryRouter><WorkspaceSuspended /></MemoryRouter>); expect(container).toBeEmptyDOMElement(); });
  it("ProtectedRoute replaces workspace pages with the recovery screen (no redirect loop), and renders pages normally otherwise", () => {
    auth.value = base(); const { rerender } = render(<MemoryRouter><ProtectedRoute><p>Secret dashboard</p></ProtectedRoute></MemoryRouter>);
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument(); expect(screen.getByRole("heading", { name: /temporarily suspended/ })).toBeInTheDocument();
    auth.value = { ...base(), suspendedWorkspace: null }; rerender(<MemoryRouter><ProtectedRoute><p>Secret dashboard</p></ProtectedRoute></MemoryRouter>); expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });
});

describe("API handling of HTTP 423 WORKSPACE_SUSPENDED", () => {
  it("raises a typed error and notifies the app with name + reference only", async () => {
    const body = { status: "error", code: "WORKSPACE_SUSPENDED", message: "internal", data: { workspace: { id: "w1", name: "Acme Ltd", reference: "WS-ABCD1234" } } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 423, json: async () => body }));
    const seen = vi.fn(); window.addEventListener("workspace:suspended", seen as EventListener);
    await expect(api.getMyWorkspaces()).rejects.toMatchObject({ name: "ApiError", statusCode: 423 });
    expect(seen).toHaveBeenCalledTimes(1); expect((seen.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: "w1", name: "Acme Ltd", reference: "WS-ABCD1234" });
    window.removeEventListener("workspace:suspended", seen as EventListener); vi.unstubAllGlobals();
  });
  it("other 423 responses are ordinary errors and fire no suspension event", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 423, json: async () => ({ message: "Locked" }) }));
    const seen = vi.fn(); window.addEventListener("workspace:suspended", seen as EventListener);
    await expect(api.getMyWorkspaces()).rejects.toBeInstanceOf(ApiError); expect(seen).not.toHaveBeenCalled(); window.removeEventListener("workspace:suspended", seen as EventListener); vi.unstubAllGlobals();
  });
});

describe("HTTP 423 without workspace detail (resource-level responses)", () => {
  it("asks the app to resolve it instead of guessing, and still raises the typed error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 423, json: async () => ({ status: "error", code: "WORKSPACE_SUSPENDED", message: "This workspace is temporarily suspended." }) }));
    const known = vi.fn(); const unknown = vi.fn(); window.addEventListener("workspace:suspended", known as EventListener); window.addEventListener("workspace:suspended-unknown", unknown as EventListener);
    await expect(api.getMyWorkspaces()).rejects.toMatchObject({ statusCode: 423 });
    expect(known).not.toHaveBeenCalled(); expect(unknown).toHaveBeenCalledTimes(1);
    window.removeEventListener("workspace:suspended", known as EventListener); window.removeEventListener("workspace:suspended-unknown", unknown as EventListener); vi.unstubAllGlobals();
  });
  it("an ordinary 500 never triggers the suspension flow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ message: "Server error" }) }));
    const any = vi.fn(); window.addEventListener("workspace:suspended-unknown", any as EventListener); window.addEventListener("workspace:suspended", any as EventListener);
    await expect(api.getMyWorkspaces()).rejects.toMatchObject({ statusCode: 500 }); expect(any).not.toHaveBeenCalled();
    window.removeEventListener("workspace:suspended-unknown", any as EventListener); window.removeEventListener("workspace:suspended", any as EventListener); vi.unstubAllGlobals();
  });
});
