import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { FakeApiError } = vi.hoisted(() => ({ FakeApiError: class FakeApiError extends Error { statusCode: number; body: unknown; name = "ApiError"; constructor(s: number, code?: string) { super("x"); this.statusCode = s; this.body = code ? { code } : undefined; } } }));
const apiMock = vi.hoisted(() => new Proxy({ getTaskById: vi.fn(), getTasks: vi.fn(), getAllTasksCrossWorkspace: vi.fn() } as Record<string, ReturnType<typeof vi.fn>>, {
  get(target, name: string) { if (!(name in target)) target[name] = vi.fn().mockResolvedValue({ data: {}, results: [], comments: [] }); return target[name]; },
}));
vi.mock("@/lib/api", () => ({ api: apiMock, ApiError: FakeApiError, triggerBlobDownload: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1", role: "executive" }, activeCompanyId: "w1", workspaceRole: "owner", workspaces: [] }) }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ on: vi.fn(), off: vi.fn(), isConnected: false, emit: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/hooks/use-breakpoint", () => ({ useBreakpoint: () => ({ isMobile: false, isTablet: false, isDesktop: true }) }));
vi.mock("@/hooks/useGoogleDriveFiles", () => ({ useGoogleDriveFiles: () => ({ files: [], isLoading: false }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/dashboard/TaskEditDrawer", () => ({ default: () => null }));
vi.mock("@/components/CreateTaskDialog", () => ({ default: () => null }));
vi.mock("@/components/ClientViewShareButton", () => ({ default: () => null }));
vi.mock("@/components/tasks/SubtaskList", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskActivityTimeline", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskWatcherSection", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskDependencySection", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskRecurrenceSection", () => ({ default: () => null }));
vi.mock("@/components/templates/SaveAsTemplateDialog", () => ({ default: () => null }));
vi.mock("@/components/tasks/GoogleDrivePickerDialog", () => ({ default: () => null }));
vi.mock("@/components/time/TaskTimePanel", () => ({ default: () => null }));
vi.mock("@/components/attachments/AttachmentSourcePicker", () => ({ default: () => null }));
vi.mock("@/components/connectedStorage/ConnectedStorageAttachmentsSection", () => ({ ConnectedStorageAttachmentsSection: () => null }));

import TaskDetails from "@/pages/TaskDetails";
const open = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/task-details/t1"]}><Routes><Route path="/task-details/:id" element={<TaskDetails />} /></Routes></MemoryRouter></QueryClientProvider>);
const task = { id: "t1", title: "Quarterly report", description: "Compile KPIs", status: "pending", priority: "high", companyId: "w1", subtasks: [], comments: [], activities: [], assignees: [], attachments: [] };

beforeEach(() => { vi.clearAllMocks(); apiMock.getTasks.mockResolvedValue({ data: { tasks: [] } }); apiMock.getAllTasksCrossWorkspace.mockResolvedValue({ data: { tasks: [] }, pagination: {} }); });
afterEach(() => cleanup());

describe("Task Workbench /task-details/:id", () => {
  it("opens the task from its id", async () => {
    apiMock.getTaskById.mockResolvedValue({ status: "success", data: { task, access: { canView: true, canEdit: true, readOnly: false } } }); open();
    expect((await screen.findAllByText("Quarterly report")).length).toBeGreaterThan(0); expect(apiMock.getTaskById).toHaveBeenCalledWith("t1");
  });

  it("a server failure shows a specific error with a Try again that recovers (no generic 'Something went wrong')", async () => {
    const user = userEvent.setup();
    apiMock.getTaskById.mockRejectedValueOnce(new FakeApiError(500, "TASK_LOAD_FAILED")).mockResolvedValueOnce({ status: "success", data: { task, access: { canView: true, canEdit: true, readOnly: false } } });
    open(); expect((await screen.findAllByTestId("task-load-error-server")).length).toBeGreaterThan(0); expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /try again/i })[0]);
    expect((await screen.findAllByText("Quarterly report")).length).toBeGreaterThan(0); expect(apiMock.getTaskById).toHaveBeenCalledTimes(2);
  });

  it.each([[403, "TASK_ACCESS_DENIED", "forbidden"], [404, "TASK_NOT_FOUND", "not_found"]])("%s is recognised (the old code compared a string to a number and never matched)", async (status, code, kind) => {
    apiMock.getTaskById.mockRejectedValue(new FakeApiError(status as number, code as string)); open();
    expect((await screen.findAllByTestId(`task-load-error-${kind}`)).length).toBeGreaterThan(0);
  });
});
