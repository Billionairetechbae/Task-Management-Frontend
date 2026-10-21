import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  company: "w1",
  api: { getTasks: vi.fn(), getCompanyAssistants: vi.fn() },
  toast: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "m1" }, activeCompanyId: mocks.company }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/dashboard/TaskEditDrawer", () => ({ default: () => null }));
vi.mock("@/components/CreateTaskDialog", () => ({ default: () => null }));
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<any>("@/lib/api");
  return { ...actual, api: mocks.api };
});

import DashboardManager from "@/pages/DashboardManager";

const task = (id: string, status: string) => ({ id, title: id, status, priority: "medium", deadline: new Date(Date.now() + 864e5).toISOString(), creator: { id: "m1" }, assignees: [] });
const member = (id: string, isVerified: boolean) => ({ id, userId: id, role: "member", status: "active", isVerified, user: { id, firstName: id } });
const tasksOk = (rows: any[]) => ({ status: "success", data: { tasks: rows } });
const membersOk = (rows: any[]) => ({ status: "success", results: rows.length, data: { members: rows } });
const card = (title: string) => screen.getByText(title).closest("div")!.parentElement!;
const render_ = () => render(<MemoryRouter><DashboardManager /></MemoryRouter>);

describe("Manager Dashboard data", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.company = "w1"; });

  it("shows real member counts from the actual API contract (data.members) and real task metrics", async () => {
    mocks.api.getTasks.mockResolvedValue(tasksOk([task("a", "completed"), task("b", "in_progress"), task("c", "pending")]));
    mocks.api.getCompanyAssistants.mockResolvedValue(membersOk([member("u1", true), member("u2", false), member("u3", true)]));
    render_();
    await screen.findByText("Total Tasks");
    expect(within(card("TeamMembers")).getByText("3")).toBeInTheDocument();
    expect(within(card("Verified TeamMembers")).getByText("2")).toBeInTheDocument();
    expect(within(card("Total Tasks")).getByText("3")).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("a legitimate empty workspace shows real zeros and the empty state, without an error", async () => {
    mocks.api.getTasks.mockResolvedValue(tasksOk([]));
    mocks.api.getCompanyAssistants.mockResolvedValue(membersOk([]));
    render_();
    await screen.findByText("No tasks available");
    expect(within(card("TeamMembers")).getByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a malformed team response does not crash the page or wipe valid task metrics, and is not shown as zero", async () => {
    mocks.api.getTasks.mockResolvedValue(tasksOk([task("a", "completed"), task("b", "pending")]));
    mocks.api.getCompanyAssistants.mockResolvedValue({ status: "success", results: 0, data: {} });
    render_();
    await screen.findByRole("alert");
    expect(within(card("Total Tasks")).getByText("2")).toBeInTheDocument();
    expect(within(card("TeamMembers")).getByText("—")).toBeInTheDocument();
    expect(within(card("TeamMembers")).getByText("Unavailable")).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error" }));
  });

  it("a failed tasks request keeps the valid team counts and does not claim there are no tasks", async () => {
    mocks.api.getTasks.mockRejectedValue(new Error("Task service down"));
    mocks.api.getCompanyAssistants.mockResolvedValue(membersOk([member("u1", true)]));
    render_();
    await screen.findByRole("alert");
    expect(within(card("TeamMembers")).getByText("1")).toBeInTheDocument();
    expect(within(card("Total Tasks")).getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("No tasks available")).toBeNull();
  });

  it("Retry reloads both sources and clears the notice", async () => {
    mocks.api.getTasks.mockResolvedValue(tasksOk([task("a", "pending")]));
    mocks.api.getCompanyAssistants.mockRejectedValueOnce(new Error("blip")).mockResolvedValue(membersOk([member("u1", true)]));
    render_();
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(within(card("TeamMembers")).getByText("1")).toBeInTheDocument();
  });

  it("switching workspace clears the old numbers and ignores a late response from the previous workspace", async () => {
    let releaseOld: (v: any) => void = () => {};
    mocks.api.getTasks.mockImplementationOnce(() => new Promise((resolve) => { releaseOld = resolve; }));
    mocks.api.getCompanyAssistants.mockResolvedValueOnce(membersOk([member("old1", true), member("old2", true)]));
    const view = render_();
    mocks.api.getTasks.mockResolvedValueOnce(tasksOk([task("new", "pending")]));
    mocks.api.getCompanyAssistants.mockResolvedValueOnce(membersOk([member("new1", false)]));
    mocks.company = "w2";
    view.rerender(<MemoryRouter><DashboardManager /></MemoryRouter>);
    await screen.findByText("Total Tasks");
    expect(within(card("TeamMembers")).getByText("1")).toBeInTheDocument();
    await act(async () => { releaseOld(tasksOk([task("o1", "pending"), task("o2", "pending"), task("o3", "pending")])); });
    expect(within(card("Total Tasks")).getByText("1")).toBeInTheDocument();
    expect(within(card("TeamMembers")).getByText("1")).toBeInTheDocument();
  });
});
