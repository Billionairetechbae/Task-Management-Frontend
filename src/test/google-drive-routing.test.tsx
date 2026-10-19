import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { DriveError, GOOGLE_DRIVE_PREFIX, googleDriveService, googleDriveUrl, toDriveError } from "@/services/googleDriveService";
import { useGoogleDrive, MAX_DRIVE_UPLOAD_BYTES } from "@/hooks/useGoogleDrive";

const driveFile = (id: string, name = id, mimeType = "text/plain") => ({ id, name, mimeType });
const envelope = (data: unknown) => ({ success: true, data });
const apiErr = (status: number, body: Record<string, unknown>) => new ApiError(String(body.message ?? "x"), status, body);

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Google Drive route construction", () => {
  it("never prefixes Drive paths with /api (the base URL already ends in /api/v1)", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue(envelope({ files: [], nextPageToken: null }) as never);
    const request = vi.spyOn(api, "request").mockResolvedValue(envelope({ id: "f1", name: "a.txt" }) as never);
    await googleDriveService.listFiles({}); await googleDriveService.searchFiles({ q: "x" }); await googleDriveService.listSharedFiles({}); await googleDriveService.getRootFolder(); await googleDriveService.getFile("f1");
    await googleDriveService.uploadFile({ file: new File(["a"], "a.txt") }); await googleDriveService.createFolder({ folderName: "n" }); await googleDriveService.deleteFile("f1"); await googleDriveService.moveFile("f1", "p");
    const paths = [...get.mock.calls, ...request.mock.calls].map((c) => c[0] as string);
    expect(paths.length).toBe(9);
    for (const p of paths) { expect(p.startsWith(`${GOOGLE_DRIVE_PREFIX}/`)).toBe(true); expect(p).not.toMatch(/^\/api\//); expect(p).not.toContain("/api/v1"); }
    expect(paths).toContain("/google-drive/upload");
  });

  it("download/export URLs do not double the API prefix", () => {
    expect(googleDriveUrl("/download/abc")).toMatch(/\/google-drive\/download\/abc$/);
    expect(googleDriveUrl("/export/abc")).not.toMatch(/\/api\/v1\/api\//);
  });

  it("download and export use the canonical URL and surface normalized errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ code: "GOOGLE_RECONNECT_REQUIRED", message: "expired" }), { status: 409 }));
    await expect(googleDriveService.downloadFile("a b")).rejects.toMatchObject({ kind: "reconnect" });
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/google-drive\/download\/a%20b$/);
    expect(String(fetchSpy.mock.calls[0][0])).not.toMatch(/\/api\/v1\/api\//);
  });
});

describe("Google Drive response handling", () => {
  it("unwraps the API envelope and exposes both id and fileId", async () => {
    vi.spyOn(api, "get").mockResolvedValue(envelope({ files: [{ fileId: "f1", name: "A" }, driveFile("f2")], nextPageToken: "n" }) as never);
    const res = await googleDriveService.listFiles({});
    expect(res.files.map((f) => [f.id, f.fileId])).toEqual([["f1", "f1"], ["f2", "f2"]]); expect(res.nextPageToken).toBe("n");
  });

  it("maps provider and routing failures to distinct kinds without leaking provider text", () => {
    expect(toDriveError(apiErr(409, { code: "GOOGLE_RECONNECT_REQUIRED", message: "m" })).kind).toBe("reconnect");
    expect(toDriveError(apiErr(409, { code: "GOOGLE_NOT_CONNECTED", message: "m" })).kind).toBe("not_connected");
    expect(toDriveError(apiErr(403, { code: "GOOGLE_PERMISSION_DENIED", message: "m" })).kind).toBe("forbidden");
    expect(toDriveError(apiErr(507, { code: "GOOGLE_QUOTA_EXCEEDED", message: "m" })).kind).toBe("quota");
    expect(toDriveError(apiErr(429, { code: "GOOGLE_RATE_LIMITED", message: "m" })).kind).toBe("rate_limited");
    expect(toDriveError(apiErr(403, { message: "Google Drive is disabled for this workspace" })).kind).toBe("disabled");
    const missing = toDriveError(apiErr(404, { message: "Route not found: POST /api/v1/api/google-drive/upload" }));
    expect(missing.kind).toBe("unknown"); expect(missing.message).not.toContain("/api/v1/api");
  });

  it("an upload is only successful when Google's created file is returned", async () => {
    vi.spyOn(api, "request").mockResolvedValue(envelope({}) as never);
    await expect(googleDriveService.uploadFile({ file: new File(["a"], "a.txt") })).rejects.toBeInstanceOf(DriveError);
    vi.spyOn(api, "request").mockResolvedValue(envelope({ id: "new1", name: "a.txt" }) as never);
    await expect(googleDriveService.uploadFile({ file: new File(["a"], "a.txt") })).resolves.toMatchObject({ file: { id: "new1", fileId: "new1" } });
  });
});

describe("useGoogleDrive", () => {
  const rootAndEmpty = () => { vi.spyOn(googleDriveService, "getRootFolder").mockResolvedValue({ id: "root", fileId: "root", name: "My Drive" } as never); vi.spyOn(googleDriveService, "listFiles").mockResolvedValue({ files: [], nextPageToken: null }); };

  it("loads My Drive, opens a folder and lists its files", async () => {
    vi.spyOn(googleDriveService, "getRootFolder").mockResolvedValue({ id: "root", fileId: "root", name: "My Drive" } as never);
    const list = vi.spyOn(googleDriveService, "listFiles").mockImplementation(async ({ folderId }) => ({ files: folderId === "root" ? [driveFile("fold", "Docs", "application/vnd.google-apps.folder") as never] : [driveFile("in1", "inner.txt") as never], nextPageToken: null }));
    const { result } = renderHook(() => useGoogleDrive("my-drive", true));
    await waitFor(() => expect(result.current.displayedFiles[0]?.name).toBe("Docs"));
    await act(async () => { await result.current.openFolder({ id: "fold", fileId: "fold", name: "Docs" } as never); });
    await waitFor(() => expect(result.current.displayedFiles[0]?.name).toBe("inner.txt"));
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ folderId: "fold" })); expect(result.current.breadcrumbs.map((b) => b.name)).toEqual(["My Drive", "Docs"]);
  });

  it("Shared with Me uses the shared endpoint", async () => {
    rootAndEmpty(); const shared = vi.spyOn(googleDriveService, "listSharedFiles").mockResolvedValue({ files: [driveFile("s1", "shared.pdf") as never], nextPageToken: null });
    const { result } = renderHook(() => useGoogleDrive("shared", true));
    await waitFor(() => expect(result.current.displayedFiles[0]?.name).toBe("shared.pdf")); expect(shared).toHaveBeenCalled();
  });

  it("search calls the search endpoint", async () => {
    rootAndEmpty(); const search = vi.spyOn(googleDriveService, "searchFiles").mockResolvedValue({ files: [driveFile("m1", "match.txt") as never], nextPageToken: null });
    const { result } = renderHook(() => useGoogleDrive("my-drive", true));
    await waitFor(() => expect(result.current.rootFolder).not.toBeNull());
    act(() => result.current.setSearchQuery("match"));
    await waitFor(() => expect(result.current.displayedFiles[0]?.name).toBe("match.txt")); expect(search).toHaveBeenCalledWith(expect.objectContaining({ q: "match" }));
  });

  it.each([["reconnect", 409, "GOOGLE_RECONNECT_REQUIRED"], ["forbidden", 403, "GOOGLE_PERMISSION_DENIED"], ["not_connected", 409, "GOOGLE_NOT_CONNECTED"]])("a %s failure becomes a distinct error state, not an empty list", async (kind, status, code) => {
    vi.spyOn(googleDriveService, "getRootFolder").mockRejectedValue(toDriveError(apiErr(status as number, { code, message: "m" })));
    const { result } = renderHook(() => useGoogleDrive("my-drive", true));
    await waitFor(() => expect(result.current.error?.kind).toBe(kind)); expect(result.current.displayedFiles).toEqual([]);
  });

  it("upload: refuses oversize files, blocks duplicate submissions, and refreshes the folder after Google confirms", async () => {
    rootAndEmpty(); let finish!: () => void;
    const upload = vi.spyOn(googleDriveService, "uploadFile").mockImplementation(() => new Promise((resolve) => { finish = () => resolve({ file: driveFile("n1") as never }); }));
    const { result } = renderHook(() => useGoogleDrive("my-drive", true));
    await waitFor(() => expect(result.current.currentFolder).not.toBeNull());
    const big = new File(["x"], "big.bin"); Object.defineProperty(big, "size", { value: MAX_DRIVE_UPLOAD_BYTES + 1 });
    await expect(result.current.uploadFile(big)).rejects.toThrow(/20 MB/); expect(upload).not.toHaveBeenCalled();
    const file = new File(["a"], "a.txt"); const listsBefore = (googleDriveService.listFiles as ReturnType<typeof vi.fn>).mock.calls.length;
    let first!: Promise<void>; act(() => { first = result.current.uploadFile(file); void result.current.uploadFile(file); });
    expect(upload).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); await first; });
    expect((googleDriveService.listFiles as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(listsBefore);
  });

  it("a failed upload does not refresh as if it succeeded and releases the guard", async () => {
    rootAndEmpty(); const upload = vi.spyOn(googleDriveService, "uploadFile").mockRejectedValueOnce(new DriveError("quota", "Your Google Drive storage is full.")).mockResolvedValueOnce({ file: driveFile("n2") as never });
    const { result } = renderHook(() => useGoogleDrive("my-drive", true));
    await waitFor(() => expect(result.current.currentFolder).not.toBeNull());
    await expect(result.current.uploadFile(new File(["a"], "a.txt"))).rejects.toMatchObject({ kind: "quota" });
    await act(async () => { await result.current.uploadFile(new File(["a"], "a.txt")); }); expect(upload).toHaveBeenCalledTimes(2);
  });
});

describe("Google Drive page states", () => {
  it("shows a Reconnect action for expired authorization and explains the file-access scope", async () => {
    vi.resetModules();
    const connect = vi.fn();
    vi.doMock("@/hooks/useGoogleIntegration", () => ({ useGoogleIntegration: () => ({ isConnected: true, status: { connected: true, services: { drive: true } }, statusLoading: false, connect, connectLoading: false }) }));
    vi.doMock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
    vi.doMock("@/components/FileViewer", () => ({ default: () => null }));
    vi.doMock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
    const svc = await import("@/services/googleDriveService");
    vi.spyOn(svc.googleDriveService, "getRootFolder").mockRejectedValue(new svc.DriveError("reconnect", "Your Google Drive authorization has expired."));
    const { default: Page } = await import("@/pages/GoogleDrivePage");
    render(<MemoryRouter><Page embedded /></MemoryRouter>);
    expect(await screen.findByTestId("drive-error-reconnect")).toBeTruthy();
    expect(screen.getByTestId("drive-scope-note").textContent).toMatch(/chosen to share|created/);
    await userEvent.click(screen.getByRole("button", { name: "Reconnect Google Drive" })); expect(connect).toHaveBeenCalled();
  });
});
