import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { classifyTaskLoadError } from "@/lib/taskLoadError";

const apiMock = vi.hoisted(() => ({
  getTaskById: vi.fn(), updateTask: vi.fn(), getCompanyTeam: vi.fn(), listTeams: vi.fn(), getTeamWorkspace: vi.fn(), getTasks: vi.fn(), getTaskSubtasks: vi.fn(), listCustomFields: vi.fn(),
  getTaskCustomFields: vi.fn(), getTaskWatchers: vi.fn(), getTaskActivity: vi.fn(), getTaskComments: vi.fn(), getTaskDependencies: vi.fn(), getTaskRecurrence: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: { id: "u1", role: "executive" }, workspaceRole: "owner", activeCompanyId: "w1", activeWorkspace: { id: "w1", name: "W" }, refreshWorkspaces: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
const { FakeApiError } = vi.hoisted(() => ({ FakeApiError: class FakeApiError extends Error { statusCode: number; body: unknown; constructor(m: string, s: number, b?: unknown) { super(m); this.name = "ApiError"; this.statusCode = s; this.body = b; } } }));

vi.mock("@/lib/api", () => ({ api: apiMock, ApiError: FakeApiError }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/components/tasks/SubtaskList", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskWatcherSection", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskActivityTimeline", () => ({ default: () => null }));
vi.mock("@/components/TeamSelector", () => ({ default: () => null }));
vi.mock("@/components/customFields/CustomFieldsForm", () => ({ default: () => null }));
vi.mock("@/components/CompanyBadge", () => ({ default: () => null }));

import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";

const realTask = (o: Record<string, unknown> = {}) => ({ id: "t1", title: "Quarterly report", description: "Compile KPIs", status: "in_progress", priority: "high", category: "Finance", teamId: "team-1", companyId: "w1", assignees: [], attachments: [], estimatedHours: 3, actualHours: 1, ...o });
const loaded = (t = realTask(), access = { canView: true, canEdit: true, readOnly: false }) => ({ status: "success", data: { task: t, access } });
const err = (status: number, code?: string) => new FakeApiError("x", status, code ? { code } : undefined);
const mount = (props: Partial<React.ComponentProps<typeof TaskEditDrawer>> = {}) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><TaskEditDrawer open onOpenChange={() => {}} taskId="t1" onTaskUpdated={vi.fn()} onTaskDeleted={vi.fn()} {...props} /></MemoryRouter></QueryClientProvider>);

beforeEach(() => { vi.clearAllMocks(); auth.workspaceRole = "owner"; apiMock.getCompanyTeam.mockResolvedValue({ data: { members: [] } }); apiMock.listTeams.mockResolvedValue({ data: { teams: [] } }); apiMock.listCustomFields.mockResolvedValue({ data: { definitions: [] } }); });
afterEach(() => cleanup());

describe("classifyTaskLoadError", () => {
  it("reads statusCode and the backend code (ApiError.status is a string and must not be compared to numbers)", () => {
    expect(classifyTaskLoadError(err(403, "TASK_ACCESS_DENIED")).kind).toBe("forbidden");
    expect(classifyTaskLoadError(err(404, "TASK_NOT_FOUND")).kind).toBe("not_found");
    expect(classifyTaskLoadError(err(423, "WORKSPACE_SUSPENDED")).kind).toBe("suspended");
    expect(classifyTaskLoadError(err(400, "INVALID_TASK_ID")).kind).toBe("invalid");
    expect(classifyTaskLoadError(err(500, "TASK_LOAD_FAILED")).kind).toBe("server");
    expect(classifyTaskLoadError(Object.assign(new Error("n"), { name: "NetworkError" })).kind).toBe("network");
    expect(classifyTaskLoadError(err(500)).retryable).toBe(true); expect(classifyTaskLoadError(err(403)).retryable).toBe(false);
  });
});

describe("Edit drawer (All Tasks)", () => {
  it("hydrates every editable field from the authorized task", async () => {
    apiMock.getTaskById.mockResolvedValue(loaded()); mount();
    expect(await screen.findByDisplayValue("Quarterly report")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Compile KPIs")).toBeInTheDocument(); expect(screen.getByDisplayValue("Finance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });

  it("shows a loading state first, never a blank form", async () => {
    let resolve!: (v: unknown) => void; apiMock.getTaskById.mockReturnValue(new Promise((r) => { resolve = r; })); mount();
    expect(screen.queryByLabelText(/^title/i)).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
    resolve(loaded()); expect(await screen.findByDisplayValue("Quarterly report")).toBeInTheDocument();
  });

  it.each([[500, "TASK_LOAD_FAILED", "task-load-error-server"], [404, "TASK_NOT_FOUND", "task-load-error-not_found"], [403, "TASK_ACCESS_DENIED", "task-load-error-forbidden"], [423, "WORKSPACE_SUSPENDED", "task-load-error-suspended"]])("a %s load failure shows a specific error state and NO editable form", async (status, code, testId) => {
    apiMock.getTaskById.mockRejectedValue(err(status, code)); mount();
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("")).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
    expect(apiMock.updateTask).not.toHaveBeenCalled();
  });

  it("offers Try again for retryable failures and recovers into the real task", async () => {
    const user = userEvent.setup(); apiMock.getTaskById.mockRejectedValueOnce(err(500, "TASK_LOAD_FAILED")).mockResolvedValueOnce(loaded());
    mount(); await user.click(await screen.findByRole("button", { name: /try again/i }));
    expect(await screen.findByDisplayValue("Quarterly report")).toBeInTheDocument(); expect(screen.queryByTestId("task-load-error-server")).not.toBeInTheDocument();
  });

  it("a read-only task shows data but no modification controls, and Save never calls the API", async () => {
    apiMock.getTaskById.mockResolvedValue(loaded(realTask(), { canView: true, canEdit: false, readOnly: true })); mount();
    expect(await screen.findByText("Read only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument(); expect(apiMock.updateTask).not.toHaveBeenCalled();
  });

  it("saving sends the loaded values once, even on a double click, and reports the update", async () => {
    const user = userEvent.setup(); const onTaskUpdated = vi.fn(); apiMock.getTaskById.mockResolvedValue(loaded());
    let finish!: (v: unknown) => void; apiMock.updateTask.mockReturnValue(new Promise((r) => { finish = r; }));
    mount({ onTaskUpdated }); const save = await screen.findByRole("button", { name: /save changes/i });
    await user.dblClick(save); expect(apiMock.updateTask).toHaveBeenCalledTimes(1);
    expect(apiMock.updateTask.mock.calls[0][1]).toMatchObject({ title: "Quarterly report", description: "Compile KPIs", category: "Finance", priority: "high", status: "in_progress" });
    finish({ data: { task: realTask({ title: "Quarterly report" }) } }); await waitFor(() => expect(onTaskUpdated).toHaveBeenCalledTimes(1));
  });

  it("a failed refresh after the task loaded keeps the loaded task and the user's edits", async () => {
    const user = userEvent.setup(); apiMock.getTaskById.mockResolvedValueOnce(loaded());
    const view = mount(); const title = await screen.findByDisplayValue("Quarterly report"); await user.clear(title); await user.type(title, "My unsaved edit");
    apiMock.getTaskById.mockRejectedValue(err(500));
    const again = (open: boolean) => <QueryClientProvider client={new QueryClient()}><MemoryRouter><TaskEditDrawer open={open} onOpenChange={() => {}} taskId="t1" onTaskUpdated={vi.fn()} onTaskDeleted={vi.fn()} /></MemoryRouter></QueryClientProvider>;
    view.rerender(again(false)); view.rerender(again(true)); await waitFor(() => expect(apiMock.getTaskById).toHaveBeenCalledTimes(2));
    expect(screen.getByDisplayValue("My unsaved edit")).toBeInTheDocument();
  });
});
