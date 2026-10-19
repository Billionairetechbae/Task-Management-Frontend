import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ getSuspended: vi.fn() }));
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, api: { ...actual.api, getSuspendedWorkspaces: mocks.getSuspended, getCurrentUser: vi.fn(), getMyWorkspaces: vi.fn().mockResolvedValue({ data: { workspaces: [] } }), logout: vi.fn() } };
});
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function Probe() { const { suspendedWorkspace, workspaces } = useAuth(); return <div><span data-testid="suspended">{suspendedWorkspace ? `${suspendedWorkspace.id}:${suspendedWorkspace.reference}` : "none"}</span><span data-testid="count">{workspaces.length}</span></div>; }
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);
beforeEach(() => { localStorage.clear(); mocks.getSuspended.mockReset(); });
afterEach(() => cleanup());

describe("AuthProvider handling of suspended-workspace signals", () => {
  it("a detailed signal shows the recovery state and removes that workspace from the usable list", async () => {
    localStorage.setItem("workspaces_cache", JSON.stringify([{ id: "w1", name: "Acme", role: "owner", status: "active" }, { id: "w2", name: "Beta", role: "member", status: "active" }]));
    mount(); await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("2"));
    act(() => { window.dispatchEvent(new CustomEvent("workspace:suspended", { detail: { id: "w1", name: "Acme", reference: "WS-1" } })); });
    expect(screen.getByTestId("suspended").textContent).toBe("w1:WS-1"); expect(screen.getByTestId("count").textContent).toBe("1");
  });
  it("an unspecific signal takes over only when the ACTIVE workspace is the suspended one", async () => {
    mocks.getSuspended.mockResolvedValue({ data: { workspaces: [{ id: "w9", name: "Other", reference: "WS-9" }] } });
    localStorage.setItem("activeCompanyId", "w1"); mount();
    act(() => { window.dispatchEvent(new Event("workspace:suspended-unknown")); });
    await waitFor(() => expect(mocks.getSuspended).toHaveBeenCalled()); expect(screen.getByTestId("suspended").textContent).toBe("none");
    mocks.getSuspended.mockResolvedValue({ data: { workspaces: [{ id: "w1", name: "Acme", reference: "WS-1" }] } });
    act(() => { window.dispatchEvent(new Event("workspace:suspended-unknown")); });
    await waitFor(() => expect(screen.getByTestId("suspended").textContent).toBe("w1:WS-1"));
  });
  it("a failing lookup never breaks the app", async () => {
    mocks.getSuspended.mockRejectedValue(new Error("offline")); localStorage.setItem("activeCompanyId", "w1"); mount();
    act(() => { window.dispatchEvent(new Event("workspace:suspended-unknown")); });
    await waitFor(() => expect(mocks.getSuspended).toHaveBeenCalled()); expect(screen.getByTestId("suspended").textContent).toBe("none");
  });
});
