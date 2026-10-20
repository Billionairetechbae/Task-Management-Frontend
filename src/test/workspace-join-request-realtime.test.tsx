import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ handlers: new Map<string, (message: any) => void>(), list: vi.fn(), connected: true }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ activeCompanyId: "workspace-1" }) }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ isConnected: state.connected, on: (type: string, handler: any) => state.handlers.set(type, handler), off: (type: string) => state.handlers.delete(type) }) }));
vi.mock("@/lib/api", () => ({ api: { listWorkspaceJoinRequests: state.list } }));

import { useWorkspaceJoinRequests } from "@/hooks/useWorkspaceJoinRequests";

function Probe() {
  const query = useWorkspaceJoinRequests({ status: "pending", page: 1, pageSize: 3 });
  return <span>{query.data?.pagination.total ?? "loading"}</span>;
}

describe("workspace join-request realtime refresh", () => {
  beforeEach(() => {
    state.handlers.clear(); state.connected = true;
    state.list.mockReset().mockResolvedValue({ data: { requests: [], pagination: { page: 1, pageSize: 3, total: 0, totalPages: 1 } } });
  });

  it("refetches on reconnect and on an authorized workspace event", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    expect(await screen.findByText("0")).toBeInTheDocument();
    const before = state.list.mock.calls.length;
    state.handlers.get("workspace_join_request_changed")?.({ companyId: "workspace-1", requestId: "request-1" });
    await waitFor(() => expect(state.list.mock.calls.length).toBeGreaterThan(before));
    const after = state.list.mock.calls.length;
    state.handlers.get("workspace_join_request_changed")?.({ companyId: "workspace-2" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.list.mock.calls.length).toBe(after);
  });

  it("does not refetch on every render, and re-syncs once after a reconnect", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    expect(await screen.findByText("0")).toBeInTheDocument();
    const settled = state.list.mock.calls.length;
    view.rerender(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    view.rerender(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.list.mock.calls.length).toBe(settled);
    state.connected = false;
    view.rerender(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    state.connected = true;
    view.rerender(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    await waitFor(() => expect(state.list.mock.calls.length).toBe(settled + 1));
  });
});
