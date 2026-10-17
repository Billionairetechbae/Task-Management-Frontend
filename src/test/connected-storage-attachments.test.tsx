import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "manager" as string | null,
  api: {
    listConnectedStorageConnections: vi.fn(), listConnectedStorageItems: vi.fn(), searchConnectedStorage: vi.fn(),
    attachConnectedStorageItem: vi.fn(), unlinkConnectedStorageAttachment: vi.fn(), openConnectedStorageAttachment: vi.fn(),
    listProjectConnectedStorageAttachments: vi.fn(), listTaskConnectedStorageAttachments: vi.fn(),
    getTaskById: vi.fn(), getTaskComments: vi.fn(), addTaskComment: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
  ws: { isConnected: false, joinTaskRoom: vi.fn(), leaveTaskRoom: vi.fn(), sendComment: vi.fn(), sendTypingIndicator: vi.fn(), on: vi.fn(), off: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api: mocks.api, triggerBlobDownload: vi.fn() }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, user: { id: "u1", firstName: "Uma", lastName: "User", email: "u@x.test", role: "manager" }, activeCompanyId: "co-1" }) }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => mocks.ws }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { ConnectedStorageAttachmentList } from "@/components/connectedStorage/ConnectedStorageAttachmentList";
import { ConnectedStorageAttachmentsSection } from "@/components/connectedStorage/ConnectedStorageAttachmentsSection";

const att = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, targetType: "task", provider: "dropbox", itemId: `item-${id}`, name, mimeType: "application/pdf", size: 2048, revision: "r1", modifiedAt: "2026-10-20T10:00:00Z",
  availability: "available", connectionStatus: "active", attachedBy: "u1", createdAt: "2026-10-21T10:00:00Z", canOpen: true, canUnlink: true, ...extra,
});
const picked = { providerItemId: "id:picked", itemType: "file", name: "picked.pdf", mimeType: "application/pdf", size: 10, revision: "r", modifiedAt: null, displayPath: "/Docs/picked.pdf", thumbnailUrl: null, selectable: true };
const withQuery = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);
const popup = () => ({ location: { href: "" }, opener: {}, close: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks(); mocks.role = "manager";
  mocks.api.listConnectedStorageConnections.mockResolvedValue({ status: "success", data: { canManage: false, connections: [{ id: "conn-1", provider: "dropbox", status: "active" }] } });
  mocks.api.listConnectedStorageItems.mockResolvedValue({ status: "success", data: { provider: "dropbox", parentId: null, folders: [], files: [picked], hasMore: false, cursor: null } });
});

describe("ConnectedStorageAttachmentList", () => {
  it("shows source, type, size and state; never renders a provider URL", async () => {
    const { container } = withQuery(<ConnectedStorageAttachmentList attachments={[att("a1", "plan.pdf"), att("a2", "gone.pdf", { availability: "deleted", canOpen: false }), att("a3", "old.pdf", { connectionStatus: "disconnected", canOpen: false }), att("a4", "x.pdf", { connectionStatus: "reauth_required", canOpen: false })] as any} />);
    const rows = screen.getAllByTestId("connected-storage-attachment");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("plan.pdf")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Dropbox")).toBeInTheDocument();
    expect(within(rows[0]).getByText("application/pdf")).toBeInTheDocument();
    expect(within(rows[0]).getByText("2.0 KB")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("status")).toHaveTextContent("File unavailable in Dropbox");
    expect(within(rows[1]).getByRole("button", { name: "Open gone.pdf" })).toBeDisabled();
    expect(within(rows[1]).getByText("gone.pdf")).toBeInTheDocument(); // historical filename stays visible
    expect(within(rows[2]).getByRole("status")).toHaveTextContent("Dropbox disconnected");
    expect(within(rows[3]).getByRole("status")).toHaveTextContent("Dropbox needs reconnection");
    expect(container.innerHTML).not.toMatch(/dropboxusercontent|href=|dropbox\.com/i);
  });

  it("Open asks the backend for a fresh link at click time and points the new tab at it", async () => {
    const tab = popup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(tab as any);
    mocks.api.openConnectedStorageAttachment.mockResolvedValue({ status: "success", data: { url: "https://dl.dropboxusercontent.com/apitl/1/abc", expiresAt: null } });
    const { container } = withQuery(<ConnectedStorageAttachmentList attachments={[att("a1", "plan.pdf")] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Open plan.pdf" }));
    await waitFor(() => expect(tab.location.href).toBe("https://dl.dropboxusercontent.com/apitl/1/abc"));
    expect(mocks.api.openConnectedStorageAttachment).toHaveBeenCalledWith("a1");
    expect(tab.opener).toBeNull();
    expect(container.innerHTML).not.toMatch(/dropboxusercontent/); // the link is never rendered or kept in the DOM
    openSpy.mockRestore();
  });

  it("Open failures close the blank tab, show a safe message and ask the owner to refresh", async () => {
    const tab = popup(); const onChanged = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(tab as any);
    mocks.api.openConnectedStorageAttachment.mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 404, body: { code: "file_unavailable" } }));
    withQuery(<ConnectedStorageAttachmentList attachments={[att("a1", "plan.pdf")] as any} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole("button", { name: "Open plan.pdf" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Could not open file", { description: "This file is no longer available in Dropbox." }));
    expect(tab.close).toHaveBeenCalled(); expect(tab.location.href).toBe(""); expect(onChanged).toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("an unsafe or non-https link from the server is never navigated to", async () => {
    const tab = popup(); const openSpy = vi.spyOn(window, "open").mockReturnValue(tab as any);
    mocks.api.openConnectedStorageAttachment.mockResolvedValue({ status: "success", data: { url: "javascript:alert(1)", expiresAt: null } });
    withQuery(<ConnectedStorageAttachmentList attachments={[att("a1", "plan.pdf")] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Open plan.pdf" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
    expect(tab.location.href).toBe(""); expect(tab.close).toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("Unlink asks for confirmation, says the Dropbox file is kept, and only then calls the API", async () => {
    mocks.api.unlinkConnectedStorageAttachment.mockResolvedValue({ status: "success", message: "Removed from Admiino. The file in Dropbox was not changed.", data: { removed: true } });
    const onChanged = vi.fn();
    withQuery(<ConnectedStorageAttachmentList attachments={[att("a1", "plan.pdf")] as any} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove plan.pdf from Admiino" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/stays in Dropbox and is not deleted/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(mocks.api.unlinkConnectedStorageAttachment).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Remove plan.pdf from Admiino" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(mocks.api.unlinkConnectedStorageAttachment).toHaveBeenCalledWith("a1"));
    expect(onChanged).toHaveBeenCalled();
    expect(mocks.toast.success).toHaveBeenCalledWith("Removed from Admiino. The file in Dropbox was not changed.");
  });

  it("no unlink control without unlink rights", () => {
    withQuery(<ConnectedStorageAttachmentList attachments={[att("a1", "plan.pdf", { canUnlink: false })] as any} />);
    expect(screen.queryByRole("button", { name: /remove plan.pdf/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open plan.pdf" })).toBeEnabled();
  });
});

describe.each([
  ["project", "listProjectConnectedStorageAttachments"],
  ["task", "listTaskConnectedStorageAttachments"],
] as const)("ConnectedStorageAttachmentsSection (%s)", (targetType, listMethod) => {
  const list = (attachments: unknown[]) => (mocks.api as any)[listMethod].mockResolvedValue({ status: "success", data: { attachments } });

  it("renders the Dropbox files delivered with the detail payload without an extra request", async () => {
    withQuery(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach={false} initialAttachments={[att("a1", "plan.pdf")] as any} />);
    expect(await screen.findByText("plan.pdf")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Dropbox files \(1\)/ })).toBeInTheDocument();
    expect((mocks.api as any)[listMethod]).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /attach from dropbox/i })).not.toBeInTheDocument();
  });

  it("Attach from Dropbox: pick -> only ids go to the attach API -> list refreshes", async () => {
    list([]);
    mocks.api.attachConnectedStorageItem.mockResolvedValue({ status: "success", data: { created: true, attachment: att("a9", "picked.pdf") } });
    withQuery(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach initialAttachments={[]} />);
    await userEvent.click(await screen.findByRole("button", { name: "Attach from Dropbox" }));
    expect(mocks.api.listConnectedStorageItems).toHaveBeenCalledWith("conn-1", expect.objectContaining({ targetType, targetId: "t-1" }), { parentId: null });
    await userEvent.click(await screen.findByRole("listitem", { name: "Select file picked.pdf" }));
    list([att("a9", "picked.pdf")]);
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await waitFor(() => expect(mocks.api.attachConnectedStorageItem).toHaveBeenCalledTimes(1));
    expect(mocks.api.attachConnectedStorageItem).toHaveBeenCalledWith({ connectionId: "conn-1", providerItemId: "id:picked", target: { type: targetType, id: "t-1" } });
    expect(Object.keys(mocks.api.attachConnectedStorageItem.mock.calls[0][0]).sort()).toEqual(["connectionId", "providerItemId", "target"]); // no filename / MIME / size / URL
    expect(mocks.toast.success).toHaveBeenCalledWith("Attached picked.pdf");
    expect(await screen.findByText("picked.pdf")).toBeInTheDocument();
  });

  it("attach failure shows a safe message and attaches nothing visible", async () => {
    list([]);
    mocks.api.attachConnectedStorageItem.mockRejectedValue(Object.assign(new Error("x"), { statusCode: 403, body: { code: "forbidden" } }));
    withQuery(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach initialAttachments={[]} />);
    await userEvent.click(await screen.findByRole("button", { name: "Attach from Dropbox" }));
    await userEvent.click(await screen.findByRole("listitem", { name: "Select file picked.pdf" }));
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Could not attach the file", { description: "You don't have permission to attach files here." }));
    expect(screen.queryByText("picked.pdf")).not.toBeInTheDocument();
  });

  it("members without modification rights see existing files but no attach action", async () => {
    mocks.role = "member";
    withQuery(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach={false} initialAttachments={[att("a1", "plan.pdf", { canUnlink: false })] as any} />);
    expect(await screen.findByText("plan.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attach from dropbox/i })).not.toBeInTheDocument();
    expect(mocks.api.listConnectedStorageConnections).not.toHaveBeenCalled();
  });

  it("owner/admin/member with rights can attach (picker entry appears)", async () => {
    for (const role of ["owner", "admin", "member"]) {
      mocks.role = role; list([]);
      const { unmount } = withQuery(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach initialAttachments={[]} />);
      expect(await screen.findByRole("button", { name: "Attach from Dropbox" })).toBeInTheDocument();
      unmount();
    }
  });

  it.each(["guest", null])("client / external / guest role %s renders nothing and makes no request", async (role) => {
    mocks.role = role;
    const { container } = withQuery(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach initialAttachments={[att("a1", "plan.pdf")] as any} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
    for (const fn of Object.values(mocks.api)) expect(fn).not.toHaveBeenCalled();
  });

  it("Dropbox disconnected: files stay visible as history with a clear state and no Open", async () => {
    withQuery(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach={false} initialAttachments={[att("a1", "plan.pdf", { connectionStatus: "disconnected", canOpen: false })] as any} />);
    expect(await screen.findByText("plan.pdf")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Dropbox disconnected");
    expect(screen.getByRole("button", { name: "Open plan.pdf" })).toBeDisabled();
  });
});

describe("wiring contract", () => {
  it("Task Details and Project Details mount the Dropbox section next to (not instead of) the existing file UI", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const task = readFileSync(join(process.cwd(), "src/pages/TaskDetails.tsx"), "utf8");
    const project = readFileSync(join(process.cwd(), "src/pages/ProjectDetails.tsx"), "utf8");
    expect(task).toContain('<ConnectedStorageAttachmentsSection targetType="task"');
    expect(task).toContain('import AttachmentSourcePicker from "@/components/attachments/AttachmentSourcePicker"');
    const attachmentPicker = readFileSync(join(process.cwd(), "src/components/attachments/AttachmentSourcePicker.tsx"), "utf8");
    expect(attachmentPicker).toContain("Upload from computer");
    expect(attachmentPicker).toContain("Google Drive");
    expect(project).toContain('<ConnectedStorageAttachmentsSection targetType="project"');
  });
});
