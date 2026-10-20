import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  handlers: new Map<string, (message: any) => void>(),
  connected: true,
  list: vi.fn(), withdraw: vi.fn(), toast: vi.fn(), open: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ activeCompanyId: null }) }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ isConnected: state.connected, on: (type: string, handler: any) => state.handlers.set(type, handler), off: (type: string) => state.handlers.delete(type) }) }));
vi.mock("@/lib/api", () => ({ api: { listMyWorkspaceJoinRequests: state.list, withdrawWorkspaceJoinRequest: state.withdraw } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }));

import { MyJoinRequests } from "@/components/workspaces/MyJoinRequests";

const row = (id: string, status: string, name = "Richie Tech") => ({ id, companyId: `w-${id}`, status, createdAt: "2026-10-20T10:00:00.000Z", workspace: { id: `w-${id}`, name } });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MyJoinRequests onOpenWorkspace={state.open} /></QueryClientProvider>);

describe("requester-facing join request states", () => {
  beforeEach(() => {
    state.handlers.clear(); state.connected = true; state.toast.mockReset();
    state.list.mockReset().mockResolvedValue({ data: { requests: [row("1", "pending"), row("2", "approved", "Beta Co"), row("3", "denied", "Gamma"), row("4", "withdrawn", "Delta")] } });
    state.withdraw.mockReset().mockResolvedValue({ status: "success" });
  });

  it("shows pending, approved, declined and withdrawn states without reviewer identities", async () => {
    mount();
    expect(await screen.findByText("Pending approval")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Declined")).toBeInTheDocument();
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Withdraw" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Open workspace" })).toBeInTheDocument();
  });

  it("withdraws a pending request only after confirmation, then refreshes", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw" }));
    expect(state.withdraw).not.toHaveBeenCalled();
    state.list.mockResolvedValue({ data: { requests: [row("1", "withdrawn")] } });
    const buttons = await screen.findAllByRole("button", { name: "Withdraw" });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(state.withdraw).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(screen.queryByText("Pending approval")).not.toBeInTheDocument());
  });

  it("an already-decided withdrawal reports the problem and shows the current state", async () => {
    state.withdraw.mockRejectedValue(new Error("This request is already approved."));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw" }));
    const buttons = await screen.findAllByRole("button", { name: "Withdraw" });
    state.list.mockResolvedValue({ data: { requests: [row("1", "approved")] } });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Withdraw" })).not.toBeInTheDocument());
  });

  it("refetches live when the decision event arrives", async () => {
    state.list.mockResolvedValue({ data: { requests: [row("1", "pending")] } });
    mount();
    expect(await screen.findByText("Pending approval")).toBeInTheDocument();
    state.list.mockResolvedValue({ data: { requests: [row("1", "approved")] } });
    state.handlers.get("workspace_join_request_changed")?.({ companyId: "w-1", status: "approved" });
    expect(await screen.findByText("Approved")).toBeInTheDocument();
  });

  it("renders nothing when there are no requests, and a retryable error when loading fails", async () => {
    state.list.mockResolvedValue({ data: { requests: [] } });
    const empty = mount();
    await waitFor(() => expect(state.list).toHaveBeenCalled());
    await waitFor(() => expect(empty.container.querySelector("[data-testid=my-join-requests]")).toBeNull());
    empty.unmount();
    state.list.mockRejectedValue(new Error("boom"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
  });
});
