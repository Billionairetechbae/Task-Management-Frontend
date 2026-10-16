import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "manager" as string | null,
  api: {
    previewConnectedStorageAttachment: vi.fn(), openConnectedStorageAttachment: vi.fn(), unlinkConnectedStorageAttachment: vi.fn(),
    listConnectedStorageConnections: vi.fn(), listConnectedStorageItems: vi.fn(), attachConnectedStorageItem: vi.fn(),
    listProjectConnectedStorageAttachments: vi.fn(), listTaskConnectedStorageAttachments: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, user: { id: "u1" } }) }));
vi.mock("@/components/OfficeDocumentPreview", () => ({ default: () => null }));

import { ConnectedStorageAttachmentList } from "@/components/connectedStorage/ConnectedStorageAttachmentList";
import { ConnectedStorageAttachmentsSection } from "@/components/connectedStorage/ConnectedStorageAttachmentsSection";

const att = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, targetType: "task", provider: "dropbox", itemId: `item-${id}`, name, mimeType: "application/octet-stream", size: 2048, revision: "r1", modifiedAt: null,
  availability: "available", connectionStatus: "active", attachedBy: "u1", createdAt: "2026-10-21T10:00:00Z", canOpen: true, canUnlink: true, previewType: null, canPreview: false, ...extra,
});
const image = att("img", "photo.png", { previewType: "image", canPreview: true });
const pdf = att("pdf", "Plan.pdf", { previewType: "pdf", canPreview: true });
const text = att("txt", "notes.txt", { previewType: "text", canPreview: true });
const docx = att("doc", "contract.docx");
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);
const err = (statusCode: number, code: string) => Object.assign(new Error("x"), { statusCode, body: { code } });
const blobOf = (type: string, body = "data") => new Blob([body], { type });

let created: string[] = []; let revoked: string[] = [];
beforeEach(() => {
  vi.clearAllMocks(); mocks.role = "manager"; created = []; revoked = [];
  (URL as any).createObjectURL = vi.fn(() => { const url = `blob:test/${created.length}`; created.push(url); return url; });
  (URL as any).revokeObjectURL = vi.fn((url: string) => { revoked.push(url); });
});
afterEach(() => vi.restoreAllMocks());

describe("Preview controls", () => {
  it("appear only for previewable files, beside (not instead of) Open; Office files keep Open only", () => {
    wrap(<ConnectedStorageAttachmentList attachments={[image, pdf, text, docx] as any} />);
    for (const name of ["photo.png", "Plan.pdf", "notes.txt"]) {
      expect(screen.getByRole("button", { name: `Preview ${name}` })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: `Open ${name}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Preview contract.docx" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open contract.docx" })).toBeEnabled();
  });

  it("an unavailable / disconnected / reconnect-needed file offers no Preview", () => {
    wrap(<ConnectedStorageAttachmentList attachments={[
      { ...image, id: "a", name: "gone.png", availability: "deleted", canOpen: false, canPreview: false },
      { ...pdf, id: "b", name: "old.pdf", connectionStatus: "disconnected", canOpen: false, canPreview: false },
    ] as any} />);
    expect(screen.queryByRole("button", { name: /^Preview/ })).not.toBeInTheDocument();
  });

  it.each([["task", "listTaskConnectedStorageAttachments"], ["project", "listProjectConnectedStorageAttachments"]] as const)("%s Dropbox files show Preview next to Open", async (...args: [string, string]) => {
    const targetType = args[0] as "task" | "project";
    wrap(<ConnectedStorageAttachmentsSection targetType={targetType} targetId="t-1" canAttach={false} initialAttachments={[image, docx] as any} />);
    expect(await screen.findByRole("button", { name: "Preview photo.png" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open photo.png" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview contract.docx" })).not.toBeInTheDocument();
  });

  it("comment attachments (compact list) show Preview too", () => {
    wrap(<ConnectedStorageAttachmentList compact attachments={[{ ...pdf, targetType: "comment" }] as any} />);
    expect(screen.getByRole("button", { name: "Preview Plan.pdf" })).toBeInTheDocument();
  });
});

describe("Preview opens inside Admiino", () => {
  it("image: shows a loading state, then renders the authenticated bytes in the app viewer; no new tab, no Dropbox link, no Open call", async () => {
    let resolve!: (v: unknown) => void;
    mocks.api.previewConnectedStorageAttachment.mockReturnValue(new Promise((r) => { resolve = r; }));
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    wrap(<ConnectedStorageAttachmentList attachments={[image] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Preview photo.png" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Loading preview");
    expect(mocks.api.previewConnectedStorageAttachment).toHaveBeenCalledWith("img");
    resolve({ blob: blobOf("image/png"), fileName: "photo.png", contentType: "image/png" });
    const img = await screen.findByRole("img", { name: "photo.png" });
    expect(img).toHaveAttribute("src", "blob:test/0");
    expect(openSpy).not.toHaveBeenCalled();
    expect(mocks.api.openConnectedStorageAttachment).not.toHaveBeenCalled();
    expect(document.body.innerHTML).not.toMatch(/dropbox(usercontent)?\.com/i);
  });

  it("PDF renders in an in-app frame; closing the viewer revokes the object URL", async () => {
    mocks.api.previewConnectedStorageAttachment.mockResolvedValue({ blob: blobOf("application/pdf", "%PDF-1.7"), fileName: "Plan.pdf", contentType: "application/pdf" });
    wrap(<ConnectedStorageAttachmentList attachments={[pdf] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Preview Plan.pdf" }));
    const frameSelector = 'iframe[title="Plan.pdf"]';
    await waitFor(() => expect(document.querySelector(frameSelector)).not.toBeNull());
    expect(document.querySelector(frameSelector)).toHaveAttribute("src", "blob:test/0");
    await userEvent.click(screen.getByRole("button", { name: "Close preview" }));
    await waitFor(() => expect(document.querySelector(frameSelector)).toBeNull());
    expect(revoked).toContain("blob:test/0");
  });

  it("text renders in the viewer frame", async () => {
    mocks.api.previewConnectedStorageAttachment.mockResolvedValue({ blob: blobOf("text/plain", "hello"), fileName: "notes.txt", contentType: "text/plain" });
    wrap(<ConnectedStorageAttachmentList attachments={[text] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Preview notes.txt" }));
    await waitFor(() => expect(document.querySelector('iframe[title="notes.txt"]')).not.toBeNull());
  });

  it.each([
    ["file_unavailable", 404, /File unavailable in Dropbox/, false],
    ["reauth_required", 409, /Dropbox needs reconnection/, false],
    ["disconnected", 409, /Dropbox disconnected/, false],
    ["rate_limited", 429, /Dropbox is busy/, false],
    ["provider_unavailable", 503, /Dropbox unavailable/, false],
    ["forbidden", 403, /No access/, false],
    ["preview_failed", 502, /Preview failed/, true],
  ])("%s: shows a clear state%s", async (code, status, title, hasOpen) => {
    mocks.api.previewConnectedStorageAttachment.mockRejectedValue(err(status as number, code as string));
    wrap(<ConnectedStorageAttachmentList attachments={[image] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Preview photo.png" }));
    const dialog = await screen.findByTestId("connected-storage-preview-dialog");
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent(title as RegExp));
    expect(within(dialog).queryByRole("button", { name: /^Open$/ }) !== null).toBe(hasOpen);
    expect(within(dialog).getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0);
  });

  it("preview_not_supported: explains and offers the existing Open flow as the fallback (never a silent download)", async () => {
    mocks.api.previewConnectedStorageAttachment.mockRejectedValue(err(415, "preview_not_supported"));
    mocks.api.openConnectedStorageAttachment.mockResolvedValue({ status: "success", data: { url: "https://dl.dropboxusercontent.com/apitl/1/abc", expiresAt: null } });
    const tab = { location: { href: "" }, opener: {}, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as any);
    wrap(<ConnectedStorageAttachmentList attachments={[image] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Preview photo.png" }));
    const dialog = await screen.findByTestId("connected-storage-preview-dialog");
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent(/can't be previewed in Admiino/));
    expect(mocks.api.openConnectedStorageAttachment).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Open" }));
    await waitFor(() => expect(tab.location.href).toBe("https://dl.dropboxusercontent.com/apitl/1/abc"));
    expect(mocks.api.openConnectedStorageAttachment).toHaveBeenCalledWith("img");
  });

  it("the existing Open button still works independently of Preview", async () => {
    mocks.api.openConnectedStorageAttachment.mockResolvedValue({ status: "success", data: { url: "https://dl.dropboxusercontent.com/apitl/1/x", expiresAt: null } });
    const tab = { location: { href: "" }, opener: {}, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as any);
    wrap(<ConnectedStorageAttachmentList attachments={[image] as any} />);
    await userEvent.click(screen.getByRole("button", { name: "Open photo.png" }));
    await waitFor(() => expect(tab.location.href).toMatch(/^https:\/\/dl\.dropboxusercontent\.com\//));
    expect(mocks.api.previewConnectedStorageAttachment).not.toHaveBeenCalled();
  });

  it("client / external roles never render attachments, so there is no Preview entry point and no request", async () => {
    for (const role of ["guest", null]) {
      mocks.role = role;
      const { container, unmount } = wrap(<ConnectedStorageAttachmentsSection targetType="task" targetId="t" canAttach initialAttachments={[image] as any} />);
      await new Promise((r) => setTimeout(r, 10));
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    for (const fn of Object.values(mocks.api)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("API client", () => {
  it("previews through the authenticated Admiino endpoint (never a Dropbox URL) and keeps the error code from the response body", async () => {
    vi.doUnmock("@/lib/api");
    const real = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("PNGDATA", { status: 200, headers: { "Content-Type": "image/png", "Content-Disposition": 'inline; filename="photo.png"' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "error", code: "preview_not_supported", reason: "type", message: "nope" }), { status: 415, headers: { "Content-Type": "application/json" } }));
    try {
      const ok = await real.api.previewConnectedStorageAttachment("att/1");
      expect(String(fetchMock.mock.calls[0][0])).toContain("/connected-storage/attachments/att%2F1/preview");
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("GET");
      expect(ok.contentType).toBe("image/png");
      await expect(real.api.previewConnectedStorageAttachment("att-2")).rejects.toMatchObject({ statusCode: 415, body: { code: "preview_not_supported", reason: "type" } });
    } finally { fetchMock.mockRestore(); }
  });
});
