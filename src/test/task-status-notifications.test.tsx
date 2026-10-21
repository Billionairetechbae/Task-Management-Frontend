import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "manager" as string | null,
  api: {
    updateTask: vi.fn(), updateTaskProgress: vi.fn(), getTaskById: vi.fn(), getTaskComments: vi.fn(), addTaskComment: vi.fn(),
    listConnectedStorageConnections: vi.fn(), listConnectedStorageItems: vi.fn(), searchConnectedStorage: vi.fn(),
    attachConnectedStorageItem: vi.fn(), unlinkConnectedStorageAttachment: vi.fn(), openConnectedStorageAttachment: vi.fn(),
    listTaskConnectedStorageAttachments: vi.fn(), downloadTaskAttachment: vi.fn(),
  },
  statusToast: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  ws: { isConnected: false, joinTaskRoom: vi.fn(), leaveTaskRoom: vi.fn(), sendComment: vi.fn(), sendTypingIndicator: vi.fn(), on: vi.fn(), off: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api: mocks.api, triggerBlobDownload: vi.fn() }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, user: { id: "u1", firstName: "Uma", lastName: "User", email: "u@x.test", role: "team_member" }, activeCompanyId: "co-1" }) }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => mocks.ws }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.statusToast }) }));
vi.mock("@/hooks/use-breakpoint", () => ({ useBreakpoint: () => ({ isMobile: false, isTablet: false }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/hooks/useGoogleDriveFiles", () => ({ useGoogleDriveFiles: () => ({ files: [], isLoading: false }) }));
vi.mock("@/hooks/usePreviewBlobUrl", () => ({ usePreviewBlobUrl: () => ({ create: vi.fn(), revoke: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/ClientViewShareButton", () => ({ default: () => null }));
vi.mock("@/components/dashboard/TaskEditDrawer", () => ({ default: () => null }));
vi.mock("@/components/CreateTaskDialog", () => ({ default: () => null }));
vi.mock("@/components/CompanyBadge", () => ({ default: () => null }));
vi.mock("@/components/AttachmentPreview", () => ({ default: () => null }));
vi.mock("@/components/tasks/FilePreviewCard", () => ({ default: () => null }));
vi.mock("@/components/tasks/SubtaskList", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskActivityTimeline", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskWatcherSection", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskDependencySection", () => ({ default: () => null }));
vi.mock("@/components/tasks/BlockedBadge", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskRecurrenceSection", () => ({ default: () => null }));
vi.mock("@/components/tasks/RepeatBadge", () => ({ default: () => null }));
vi.mock("@/components/templates/SaveAsTemplateDialog", () => ({ default: () => null }));
vi.mock("@/components/tasks/GoogleDrivePickerDialog", () => ({ default: () => null }));
vi.mock("@/components/customFields/CustomFieldValueDisplay", () => ({ default: () => null }));

import TaskDetails from "@/pages/TaskDetails";


vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, disabled, children }: any) => <div data-testid="status-control" data-current={value}>{["in_progress", "in_review"].map(status => <button key={status} disabled={disabled} onClick={() => onValueChange(status)}>{status}</button>)}{children}</div>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <span>{children}</span>,
}));
function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/task-details/task-1"]}><Routes><Route path="/task-details/:id" element={<TaskDetails />} /></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.getTaskById.mockResolvedValue({ data: { task: { id: "task-1", title: "Report", status: "completed", priority: "medium", attachments: [], subtasks: [], creator: { id: "other" }, assigneeId: "u1", assignees: [] }, access: { canView: true, canEdit: true, readOnly: false } } });
  mocks.api.getTaskComments.mockResolvedValue({ comments: [] });
  mocks.api.listTaskConnectedStorageAttachments.mockResolvedValue({ data: { attachments: [] } });
  mocks.api.listConnectedStorageConnections.mockResolvedValue({ data: { connections: [] } });
  mocks.api.updateTask.mockResolvedValue({ status: "success" });
});
it.each(["in_progress", "in_review"])("member status %s uses canonical update, not legacy progress", async status => {
  mount();
  await screen.findAllByText("Report");
  const controls = await screen.findAllByTestId("status-control");
  const control = controls.find(c => c.getAttribute("data-current") === "completed")!;
  fireEvent.click(within(control).getByRole("button", { name: status }));
  await waitFor(() => expect(mocks.api.updateTask).toHaveBeenCalledWith("task-1", { status }));
  expect(mocks.api.updateTaskProgress).not.toHaveBeenCalled();
  await waitFor(() => expect(mocks.statusToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Success" })));
});
it("backend rejection stays an error and does not show success", async () => {
  mocks.api.updateTask.mockRejectedValue(new Error("Permission denied")); mount();
  await screen.findAllByText("Report");
  const control = (await screen.findAllByTestId("status-control")).find(c => c.getAttribute("data-current") === "completed")!;
  fireEvent.click(within(control).getByRole("button", { name: "in_review" }));
  await waitFor(() => expect(mocks.statusToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", description: "Permission denied" })));
  expect(mocks.statusToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Success" }));
});
