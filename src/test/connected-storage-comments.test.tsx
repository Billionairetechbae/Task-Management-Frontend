import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "manager" as string | null,
  api: {
    getTaskById: vi.fn(), getTaskComments: vi.fn(), addTaskComment: vi.fn(),
    listConnectedStorageConnections: vi.fn(), listConnectedStorageItems: vi.fn(), searchConnectedStorage: vi.fn(),
    attachConnectedStorageItem: vi.fn(), unlinkConnectedStorageAttachment: vi.fn(), openConnectedStorageAttachment: vi.fn(),
    listTaskConnectedStorageAttachments: vi.fn(), downloadTaskAttachment: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
  ws: { isConnected: false, joinTaskRoom: vi.fn(), leaveTaskRoom: vi.fn(), sendComment: vi.fn(), sendTypingIndicator: vi.fn(), on: vi.fn(), off: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api: mocks.api, triggerBlobDownload: vi.fn() }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, user: { id: "u1", firstName: "Uma", lastName: "User", email: "u@x.test", role: "manager" }, activeCompanyId: "co-1" }) }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => mocks.ws }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
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

const att = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, targetType: "comment", provider: "dropbox", itemId: `item-${id}`, name, mimeType: "application/pdf", size: 2048, revision: "r1", modifiedAt: null,
  availability: "available", connectionStatus: "active", attachedBy: "u1", createdAt: "2026-10-21T10:00:00Z", canOpen: true, canUnlink: true, ...extra,
});
const comment = (id: string, content: string, extra: Record<string, unknown> = {}) => ({
  id, taskId: "task-1", userId: "u2", content, isSystemMessage: false, metadata: {}, createdAt: "2026-10-21T09:00:00Z", updatedAt: "2026-10-21T09:00:00Z",
  user: { id: "u2", firstName: "Sam", lastName: "Other", email: "s@x.test", role: "team_member" }, attachments: [], ...extra,
});
const picked = { providerItemId: "id:picked", itemType: "file", name: "picked.pdf", mimeType: "application/pdf", size: 10, revision: "r", modifiedAt: null, displayPath: "/Docs/picked.pdf", thumbnailUrl: null, selectable: true };

function renderTask() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/task-details/task-1"]}>
        <Routes><Route path="/task-details/:id" element={<TaskDetails />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks(); mocks.role = "manager";
  mocks.api.getTaskById.mockResolvedValue({ status: "success", data: { task: { id: "task-1", title: "Ship it", status: "pending", priority: "medium", attachments: [], subtasks: [], creator: { id: "u1", firstName: "Uma", lastName: "User" }, assignees: [] }, access: { canView: true, canEdit: true, readOnly: false }, connectedStorageAttachments: [] } });
  mocks.api.getTaskComments.mockResolvedValue({ success: true, comments: [comment("c1", "Here is the spec", { connectedStorageAttachments: [att("a1", "spec.pdf", { canUnlink: false })] })] });
  mocks.api.listConnectedStorageConnections.mockResolvedValue({ status: "success", data: { canManage: false, connections: [{ id: "conn-1", provider: "dropbox", status: "active" }] } });
  mocks.api.listConnectedStorageItems.mockResolvedValue({ status: "success", data: { provider: "dropbox", parentId: null, folders: [], files: [picked], hasMore: false, cursor: null } });
  mocks.api.listTaskConnectedStorageAttachments.mockResolvedValue({ status: "success", data: { attachments: [] } });
});

async function pickInComposer() {
  await userEvent.click(await screen.findByRole("button", { name: "Add attachment" }));
  await userEvent.click(await screen.findByRole("button", { name: "Attach from Dropbox" }));
  await userEvent.click(await screen.findByRole("listitem", { name: "Select file picked.pdf" }));
  await userEvent.click(screen.getByRole("button", { name: "Select" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

describe("Task comments with Dropbox files", () => {
  it("renders Dropbox attachments on existing comments through the normalized list", async () => {
    renderTask();
    expect(await screen.findByText("Here is the spec")).toBeInTheDocument();
    const list = await screen.findAllByTestId("connected-storage-attachments");
    expect(within(list[0]).getByText("spec.pdf")).toBeInTheDocument();
    expect(within(list[0]).getByRole("button", { name: "Open spec.pdf" })).toBeEnabled();
    expect(within(list[0]).queryByRole("button", { name: /remove spec.pdf/i })).not.toBeInTheDocument(); // canUnlink false
  });

  it("attach before submit: the selection shows as a pending chip and nothing is attached yet; submit sends ids only", async () => {
    mocks.api.addTaskComment.mockResolvedValue({ success: true, involvedUsers: [], comment: comment("c2", "with file", { userId: "u1", connectedStorageAttachments: [att("a2", "picked.pdf")] }) });
    renderTask();
    await screen.findByText("Here is the spec");
    await pickInComposer();
    const pending = await screen.findByTestId("pending-connected-storage");
    expect(pending).toHaveTextContent("Dropbox: picked.pdf");
    expect(mocks.api.attachConnectedStorageItem).not.toHaveBeenCalled(); // not attached before the comment exists
    fireEvent.change(screen.getByPlaceholderText("Type a message..."), { target: { value: "with file" } });
    await userEvent.click(screen.getByRole("button", { name: "Send comment" }));
    await waitFor(() => expect(mocks.api.addTaskComment).toHaveBeenCalledTimes(1));
    const [taskId, content, options] = mocks.api.addTaskComment.mock.calls[0];
    expect([taskId, content]).toEqual(["task-1", "with file"]);
    expect(options.connectedStorageAttachments).toEqual([{ connectionId: "conn-1", providerItemId: "id:picked" }]);
    expect(mocks.api.attachConnectedStorageItem).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId("pending-connected-storage")).not.toBeInTheDocument());
    expect(await screen.findByText("picked.pdf")).toBeInTheDocument(); // rendered from the committed comment
  });

  it("the comment picker is opened with the new-comment target (task id), not a persisted attachment", async () => {
    renderTask();
    await screen.findByText("Here is the spec");
    await userEvent.click(await screen.findByRole("button", { name: "Add attachment" }));
    await userEvent.click(await screen.findByRole("button", { name: "Attach from Dropbox" }));
    await waitFor(() => expect(mocks.api.listConnectedStorageItems).toHaveBeenCalled());
    expect(mocks.api.listConnectedStorageItems.mock.calls[0][1]).toEqual({ targetType: "comment", targetId: undefined, taskId: "task-1" });
  });

  it("failed submission leaves no visible attachment, keeps the selection for retry, and removes the optimistic comment", async () => {
    mocks.api.addTaskComment.mockRejectedValue(Object.assign(new Error("Dropbox needs to be reconnected by a workspace owner or admin."), { statusCode: 409, body: { code: "reauth_required" } }));
    renderTask();
    await screen.findByText("Here is the spec");
    await pickInComposer();
    fireEvent.change(screen.getByPlaceholderText("Type a message..."), { target: { value: "will fail" } });
    await userEvent.click(screen.getByRole("button", { name: "Send comment" }));
    await waitFor(() => expect(mocks.api.addTaskComment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("will fail", { selector: "p, div, span" })).not.toBeInTheDocument());
    expect(screen.getByTestId("pending-connected-storage")).toHaveTextContent("picked.pdf"); // still pending, retry possible
    expect(screen.queryAllByTestId("connected-storage-attachment")).toHaveLength(1); // only the pre-existing one
    expect(mocks.api.attachConnectedStorageItem).not.toHaveBeenCalled();
  });

  it("a pending Dropbox file can be removed before sending", async () => {
    renderTask();
    await screen.findByText("Here is the spec");
    await pickInComposer();
    await userEvent.click(await screen.findByRole("button", { name: "Remove picked.pdf from this comment" }));
    expect(screen.queryByTestId("pending-connected-storage")).not.toBeInTheDocument();
  });

  it.each(["guest", null])("client / external role %s has no Dropbox entry in the composer and no Connected Storage requests", async (role) => {
    mocks.role = role;
    mocks.api.getTaskComments.mockResolvedValue({ success: true, comments: [comment("c1", "Visible to client")] }); // server omits the key for clients
    renderTask();
    await screen.findByText("Visible to client");
    await userEvent.click(await screen.findByRole("button", { name: "Add attachment" }));
    expect(screen.queryByRole("button", { name: "Attach from Dropbox" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("connected-storage-attachments")).not.toBeInTheDocument();
    expect(mocks.api.listConnectedStorageConnections).not.toHaveBeenCalled();
    expect(mocks.api.listTaskConnectedStorageAttachments).not.toHaveBeenCalled();
  });
});
