import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const base = vi.hoisted(() => ({
  request: { id: "request-1", companyId: "workspace-1", requesterUserId: "applicant-1", status: "pending", createdAt: "2026-10-20T10:00:00.000Z", message: "I run operations.", requester: { id: "applicant-1", firstName: "Jane", lastName: "Smith", email: "jane@example.test", emailVerified: true, isActive: true }, workspace: { id: "workspace-1", name: "Richie Tech" } } as any,
}));
const state = vi.hoisted(() => ({
  role: "owner" as string,
  activeCompanyId: "workspace-1",
  workspaces: [{ id: "workspace-1" }] as { id: string }[],
  refresh: vi.fn(),
  refetch: vi.fn(),
  setActive: vi.fn(),
  hook: { data: undefined as any, isPending: false, isError: false },
  hookArgs: [] as any[],
  api: { getWorkspaceJoinRequest: vi.fn(), decideWorkspaceJoinRequest: vi.fn() },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: state.role, activeCompanyId: state.activeCompanyId, workspaces: state.workspaces, setActiveCompanyId: state.setActive, refreshWorkspaces: state.refresh }) }));
vi.mock("@/hooks/useWorkspaceJoinRequests", () => ({ useWorkspaceJoinRequests: (...args: any[]) => { state.hookArgs.push(args); return { ...state.hook, refetch: state.refetch }; } }));
vi.mock("@/lib/api", () => ({ api: state.api }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));

import WorkspaceJoinRequests from "@/pages/WorkspaceJoinRequests";
import { JoinRequestsPreview } from "@/components/workspaces/JoinRequestsPreview";
import { getNotificationLink } from "@/lib/notificationLink";

const page = (requests: any[], total = requests.length) => ({ requests, pagination: { page: 1, pageSize: 10, total, totalPages: Math.max(1, Math.ceil(total / 10)) } });
const Where = () => { const location = useLocation(); return <output data-testid="where">{location.pathname + location.search}</output>; };
const renderPage = (url = "/settings/workspace/join-requests") => render(<MemoryRouter initialEntries={[url]}><WorkspaceJoinRequests /><Where /></MemoryRouter>);

describe("workspace join-request UI", () => {
  beforeEach(() => {
    state.role = "owner"; state.activeCompanyId = "workspace-1"; state.workspaces = [{ id: "workspace-1" }]; state.hookArgs = [];
    state.hook = { data: page([base.request]), isPending: false, isError: false };
    state.refetch.mockReset().mockResolvedValue({});
    state.refresh.mockReset().mockResolvedValue([{ id: "workspace-1" }]);
    state.setActive.mockReset();
    state.api.getWorkspaceJoinRequest.mockReset().mockResolvedValue({ data: { request: base.request } });
    state.api.decideWorkspaceJoinRequest.mockReset().mockResolvedValue({ status: "success" });
  });

  it("shows the canonical request screen with verified identity and approve action", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Join Requests" })).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.test")).toBeInTheDocument();
    expect(screen.getByText("Verified email")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Jane Smith/i }));
    expect(await screen.findByText("I run operations.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Approve as Member/i }));
    expect(screen.getByText(/Team and restricted Project access remain separate/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    await waitFor(() => expect(state.api.decideWorkspaceJoinRequest).toHaveBeenCalledWith("request-1", "approve"));
    await waitFor(() => expect(state.refetch).toHaveBeenCalled());
  });

  it("declines after confirmation with the decline action", async () => {
    renderPage("/settings/workspace/join-requests?requestId=request-1");
    fireEvent.click(await screen.findByRole("button", { name: /^Decline$/ }));
    const confirmButtons = await screen.findAllByRole("button", { name: "Decline" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => expect(state.api.decideWorkspaceJoinRequest).toHaveBeenCalledWith("request-1", "decline"));
  });

  it("an already-processed request shows its current state instead of stale actions", async () => {
    state.api.decideWorkspaceJoinRequest.mockRejectedValueOnce(new Error("This request is already approved."));
    state.api.getWorkspaceJoinRequest
      .mockResolvedValueOnce({ data: { request: base.request } })
      .mockResolvedValueOnce({ data: { request: { ...base.request, status: "approved", decidedAt: "2026-10-20T11:00:00.000Z", decidedBy: { id: "o", firstName: "Olu", lastName: "Owner", email: "o@example.test" } } } });
    renderPage("/settings/workspace/join-requests?requestId=request-1");
    fireEvent.click(await screen.findByRole("button", { name: /Approve as Member/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Olu Owner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve as Member/i })).not.toBeInTheDocument();
  });

  it("status history: the status filter comes from the URL and decision details are shown", async () => {
    state.hook = { data: page([{ ...base.request, status: "denied", decidedAt: "2026-10-20T11:00:00.000Z", decidedBy: { id: "a", firstName: "Ada", lastName: "Admin", email: "a@example.test" } }]), isPending: false, isError: false };
    state.api.getWorkspaceJoinRequest.mockResolvedValue({ data: { request: state.hook.data.requests[0] } });
    renderPage("/settings/workspace/join-requests?status=denied&requestId=request-1");
    expect(state.hookArgs[0][0]).toMatchObject({ status: "denied", page: 1 });
    expect(await screen.findByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getAllByText(/declined/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Approve as Member/i })).not.toBeInTheDocument();
  });

  it("loading, error (with retry) and empty states are explicit", () => {
    state.hook = { data: undefined, isPending: true, isError: false };
    const first = renderPage(); expect(screen.getByText(/Loading join requests/i)).toBeInTheDocument(); first.unmount();
    state.hook = { data: undefined, isPending: false, isError: true };
    const second = renderPage(); fireEvent.click(screen.getByRole("button", { name: /Try again/i })); expect(state.refetch).toHaveBeenCalled(); second.unmount();
    state.hook = { data: page([]), isPending: false, isError: false };
    renderPage(); expect(screen.getByText(/No pending requests/i)).toBeInTheDocument();
  });

  it("members are blocked; admins are allowed; private data is never rendered for members", () => {
    state.role = "member";
    const member = renderPage();
    expect(screen.getByText(/owner or admin access is required/i)).toBeInTheDocument();
    expect(screen.queryByText("jane@example.test")).not.toBeInTheDocument();
    expect(state.hookArgs.every((args) => args[1] === false)).toBe(true);
    member.unmount();
    state.role = "admin";
    renderPage();
    expect(screen.getByText("jane@example.test")).toBeInTheDocument();
  });

  it("workspace deep link switches to a workspace the user belongs to", async () => {
    state.activeCompanyId = "workspace-1"; state.workspaces = [{ id: "workspace-1" }, { id: "workspace-2" }];
    renderPage("/settings/workspace/join-requests?workspaceId=workspace-2&requestId=request-1");
    await waitFor(() => expect(state.setActive).toHaveBeenCalledWith("workspace-2"));
    expect(state.hookArgs.every((args) => args[1] === false)).toBe(true);
  });

  it("workspace deep link to an unrelated workspace refreshes once, never switches, and shows an unavailable state", async () => {
    renderPage("/settings/workspace/join-requests?workspaceId=foreign&requestId=request-1");
    expect(await screen.findByText("Workspace unavailable")).toBeInTheDocument();
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(state.setActive).not.toHaveBeenCalled();
    expect(state.api.getWorkspaceJoinRequest).not.toHaveBeenCalled();
    expect(screen.queryByText("jane@example.test")).not.toBeInTheDocument();
  });

  it("a deep link to a request that no longer exists shows the unavailable-request state", async () => {
    state.api.getWorkspaceJoinRequest.mockRejectedValue(new Error("This join request is unavailable."));
    renderPage("/settings/workspace/join-requests?requestId=gone");
    expect(await screen.findByText("Request unavailable")).toBeInTheDocument();
  });

  it("renders the reusable dashboard preview with a pending count and links; compact form for Team Management", () => {
    const full = render(<MemoryRouter><JoinRequestsPreview /></MemoryRouter>);
    expect(screen.getByLabelText("1 pending join requests")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Jane Smith/i })).toHaveAttribute("href", "/settings/workspace/join-requests?requestId=request-1");
    expect(screen.getByRole("link", { name: /View all requests/i })).toHaveAttribute("href", "/settings/workspace/join-requests");
    expect(state.hookArgs.at(-1)[0]).toMatchObject({ status: "pending", pageSize: 3 });
    full.unmount();
    render(<MemoryRouter><JoinRequestsPreview compact /></MemoryRouter>);
    expect(state.hookArgs.at(-1)[0]).toMatchObject({ pageSize: 1 });
    expect(screen.queryByText("jane@example.test")).not.toBeInTheDocument();
  });

  it("preview empty and error states", () => {
    state.hook = { data: page([]), isPending: false, isError: false };
    const empty = render(<MemoryRouter><JoinRequestsPreview /></MemoryRouter>);
    expect(screen.getByText(/No pending workspace join requests/i)).toBeInTheDocument(); empty.unmount();
    state.hook = { data: undefined, isPending: false, isError: true };
    render(<MemoryRouter><JoinRequestsPreview /></MemoryRouter>);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("routes incoming and outcome notifications to secure workspace-aware destinations", () => {
    expect(getNotificationLink({ type: "workspace_join_requested", companyId: "workspace-1", data: { requestId: "request-1", companyId: "workspace-1" } } as any)).toBe("/settings/workspace/join-requests?workspaceId=workspace-1&requestId=request-1");
    expect(getNotificationLink({ type: "workspace_join_decided", companyId: "workspace-1", data: { status: "approved", companyId: "workspace-1" } } as any)).toBe("/dashboard?workspaceId=workspace-1");
    expect(getNotificationLink({ type: "workspace_join_decided", data: { status: "denied" } } as any)).toBe("/onboarding/workspace");
    expect(getNotificationLink({ type: "workspace_join_requested", companyId: "w&x", data: { requestId: "r/1" } } as any)).toBe("/settings/workspace/join-requests?workspaceId=w%26x&requestId=r%2F1");
  });
});
