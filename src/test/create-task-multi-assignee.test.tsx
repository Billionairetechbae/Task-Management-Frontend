import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ canAssign: true, role: "member" as string }));
const api = vi.hoisted(() => ({
  getCompanyTeam: vi.fn(), getTasks: vi.fn(), createTask: vi.fn(), createProjectTask: vi.fn(), getTeam: vi.fn(),
  listCustomFields: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: state.role, user: { id: "kv", role: "user" } }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: (key: string) => key !== "assign_workspace_members" || state.canAssign }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock("@/hooks/use-google-integration", () => ({ default: () => ({ data: { connected: false } }) }));
vi.mock("@/components/TeamSelector", () => ({ default: () => <div /> }));
vi.mock("@/components/templates/useTemplateNavigation", () => ({ useTemplateNavigation: () => vi.fn() }));
vi.mock("@/components/templates/UseTemplateFlow", () => ({ default: () => null }));
vi.mock("@/components/customFields/CustomFieldsForm", () => ({ default: () => null }));

import CreateTaskDialog from "@/components/CreateTaskDialog";

const member = (userId: string, firstName: string, lastName: string, email: string, extra: Record<string, unknown> = {}, top: Record<string, unknown> = {}) => ({
  id: `m-${userId}`, userId, companyId: "w1", role: "member", status: "active", isVerified: true, createdAt: "", updatedAt: "", ...top,
  user: { id: userId, firstName, lastName, email, isActive: true, ...extra },
});
const directory = [
  member("kv", "Kehinde", "Victor", "kehinde@example.com"),
  member("r1", "Richard", "Kehinde", "richard.one@example.com"),
  member("r2", "Richard", "Kehinde", "richard.two@example.com"),
  member("gone", "Dormant", "User", "dormant@example.com", { isActive: false }),
  member("removed", "Removed", "User", "removed@example.com", {}, { status: "removed" }),
];

beforeAll(() => {
  (globalThis as any).ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView ||= vi.fn();
  Element.prototype.hasPointerCapture ||= () => false;
  Element.prototype.releasePointerCapture ||= () => {};
});

function mount(onSuccess = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}><CreateTaskDialog open onOpenChange={() => undefined} onSuccess={onSuccess} initialDeadline="2026-11-01T10:00" /></QueryClientProvider>);
  return { onSuccess, spy };
}
async function fillAndPick(...emails: string[]) {
  await userEvent.type(screen.getByPlaceholderText("Enter task title"), "Project Richie");
  await userEvent.type(screen.getByPlaceholderText("Describe the task..."), "Details");
  await waitFor(() => expect(document.querySelector('input[type="datetime-local"]')).toHaveValue("2026-11-01T10:00"));
  await userEvent.click(await screen.findByRole("combobox", { name: /Assignees/i }));
  for (const email of emails) await userEvent.click(await screen.findByRole("option", { name: new RegExp(email.replace(".", "\\.")) }));
  await userEvent.keyboard("{Escape}");
}
const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Create Task" }).closest("form")!);

describe("Create Task: multiple assignees", () => {
  beforeEach(() => {
    state.canAssign = true; state.role = "member";
    Object.values(api).forEach((fn) => (fn as any).mockReset?.());
    api.getCompanyTeam.mockResolvedValue({ status: "success", results: directory.length, data: { members: directory } });
    api.getTasks.mockResolvedValue({ data: { tasks: [] } });
    api.listCustomFields.mockResolvedValue({ data: { definitions: [] } });
    api.createTask.mockResolvedValue({ data: { task: { id: "t1" } } });
  });

  it("offers only eligible people, distinguishes duplicate names by email and marks the signed-in user", async () => {
    mount();
    await userEvent.click(await screen.findByRole("combobox", { name: /Assignees/i }));
    expect(await screen.findByRole("option", { name: "Richard Kehinde (richard.one@example.com)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Richard Kehinde (richard.two@example.com)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Me — Kehinde Victor (kehinde@example.com)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /dormant/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /removed@/i })).not.toBeInTheDocument();
  });

  it("submits stable user ids for several assignees (JSON array, first is the primary)", async () => {
    const { onSuccess, spy } = mount();
    await fillAndPick("richard.two@example.com", "richard.one@example.com");
    expect(screen.getByTestId("assignee-count")).toHaveTextContent("2 selected");
    submit();
    await waitFor(() => expect(api.createTask).toHaveBeenCalledTimes(1));
    const form: FormData = api.createTask.mock.calls[0][0];
    expect(JSON.parse(String(form.get("assigneeIds")))).toEqual(["r2", "r1"]);
    expect(form.get("assigneeId")).toBe("r2");
    expect(String(form.get("title"))).toBe("Project Richie");
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const roots = spy.mock.calls.map((call) => (call[0] as { queryKey: string[] }).queryKey[0]);
    for (const root of ["tasks", "dashboard", "all-tasks-cross-workspace"]) expect(roots).toContain(root);
  });

  it("creating without an assignee sends neither field (unassigned tasks stay supported)", async () => {
    mount();
    await fillAndPick();
    submit();
    await waitFor(() => expect(api.createTask).toHaveBeenCalled());
    const form: FormData = api.createTask.mock.calls[0][0];
    expect(form.get("assigneeIds")).toBeNull(); expect(form.get("assigneeId")).toBeNull();
  });

  it("a rejected assignment is reported, nothing is reported as created, and the selection is kept for correction", async () => {
    api.createTask.mockRejectedValue(Object.assign(new Error("One or more assignees are not members of this workspace."), { code: "ASSIGNEE_NOT_IN_WORKSPACE" }));
    const { onSuccess } = mount();
    await fillAndPick("richard.one@example.com");
    submit();
    await waitFor(() => expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive", description: expect.stringMatching(/not members of this workspace/) })));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId("assignee-count")).toHaveTextContent("1 selected");
    expect(screen.getByPlaceholderText("Enter task title")).toHaveValue("Project Richie");
  });

  it("form validation: required fields block submission before any request", async () => {
    mount();
    await userEvent.click(await screen.findByRole("combobox", { name: /Assignees/i }));
    await userEvent.click(await screen.findByRole("option", { name: /richard\.one/ }));
    submit();
    await waitFor(() => expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Missing Fields" })));
    expect(api.createTask).not.toHaveBeenCalled();
  });

  it("a member without the assign permission only sees 'Assign to Me' and never a people directory", async () => {
    state.canAssign = false;
    mount();
    expect(await screen.findByText(/only assign tasks to yourself/i)).toBeInTheDocument();
    expect(api.getCompanyTeam).not.toHaveBeenCalled();
    await userEvent.type(screen.getByPlaceholderText("Enter task title"), "Mine");
    await userEvent.type(screen.getByPlaceholderText("Describe the task..."), "d");
    await userEvent.click(screen.getByRole("button", { name: /Assign to Me/ }));
    await waitFor(() => expect(document.querySelector('input[type="datetime-local"]')).toHaveValue("2026-11-01T10:00"));
    submit();
    await waitFor(() => expect(api.createTask).toHaveBeenCalled());
    expect(JSON.parse(String((api.createTask.mock.calls[0][0] as FormData).get("assigneeIds")))).toEqual(["kv"]);
  });

  it("loading and empty directory states", async () => {
    let resolve: (value: unknown) => void = () => {};
    api.getCompanyTeam.mockReturnValue(new Promise((r) => { resolve = r; }));
    mount();
    expect(await screen.findByText(/Loading people/)).toBeInTheDocument();
    resolve({ data: { members: [] } });
    await userEvent.click(await screen.findByRole("combobox", { name: /Assignees/i }));
    expect(await screen.findByText(/No eligible people/)).toBeInTheDocument();
  });
});
