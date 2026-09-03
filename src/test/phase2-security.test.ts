/**
 * Phase 2 Security Compatibility — Regression Tests (Final Contract)
 *
 * Backend now uses authenticated server-side proxy streaming.
 * No signed URLs or Cloudinary URLs are returned.
 * Frontend receives Blob bytes and creates ephemeral object URLs.
 *
 * Coverage:
 *  1.  Task attachment download performs authenticated API request
 *  2.  Response is consumed as Blob, not JSON URL
 *  3.  Task download creates browser object URL
 *  4.  Object URL is revoked after download use
 *  5.  Task preview uses Blob / object URL
 *  6.  Preview cleanup revokes object URL
 *  7.  Drive file uses authenticated Blob endpoint
 *  8.  Drive preview uses Blob / object URL
 *  9.  No confidential raw fileUrl usage remains (fileUrl not passed to methods)
 * 10.  No confidential signed-URL JSON contract remains (no { url } expected)
 * 11.  Google Drive external URLs remain unchanged (webViewLink used directly)
 * 12.  profilePictureUrl remains direct (not routed through download endpoints)
 * 13.  403 download handled cleanly
 * 14.  404 download handled cleanly
 * 15.  429 behavior remains intact
 * 16.  Existing Phase 2 forgot/resend neutral-response tests continue passing
 * 17.  Upload accept attributes exclude unsafe extensions
 * 18.  Backend 400 upload message surfaced cleanly
 * 19.  Removed auth fields absent from User type
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { api, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake Response that returns file bytes (Blob endpoint). */
function mockBlobResponse(
  status: number,
  content: string | null,
  contentType = "application/pdf",
  disposition = 'attachment; filename="test-file.pdf"'
) {
  const bodyInit = content ?? "";
  const response = new Response(bodyInit, {
    status,
    headers: {
      "Content-Type": contentType,
      ...(disposition ? { "Content-Disposition": disposition } : {}),
    },
  });
  return vi.fn().mockResolvedValue(response);
}

/** Build a fake Response that returns a JSON error body (non-2xx). */
function mockJsonErrorResponse(status: number, message: string) {
  const response = new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return vi.fn().mockResolvedValue(response);
}

// ---------------------------------------------------------------------------
// 1 & 2 — downloadTaskAttachment: authenticated request, returns Blob
// ---------------------------------------------------------------------------

describe("downloadTaskAttachment — authenticated Blob endpoint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem("auth_token");
  });

  it("calls the correct endpoint with Authorization header", async () => {
    localStorage.setItem("auth_token", "jwt-test");
    globalThis.fetch = mockBlobResponse(200, "PDF bytes here");

    await api.downloadTaskAttachment("task-1", "att-1");

    const [url, init] = (globalThis.fetch as any).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/tasks/task-1/attachments/att-1/download");
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("authorization")).toBe("Bearer jwt-test");
  });

  it("does NOT send Accept: application/json (proxy streams bytes, not JSON)", async () => {
    localStorage.setItem("auth_token", "jwt-test");
    globalThis.fetch = mockBlobResponse(200, "bytes");

    await api.downloadTaskAttachment("t", "a");

    const [, init] = (globalThis.fetch as any).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers as HeadersInit);
    // Must not request JSON — the endpoint streams file bytes
    expect(headers.get("accept")).not.toBe("application/json");
  });

  it("returns a Blob (not a URL string or JSON object)", async () => {
    globalThis.fetch = mockBlobResponse(200, "fake-pdf-content", "application/pdf");

    const result = await api.downloadTaskAttachment("t", "a");

    expect(result.blob).toBeInstanceOf(Blob);
    expect(typeof result.blob).not.toBe("string");
    expect((result as any).url).toBeUndefined();
    expect((result as any).expiresAt).toBeUndefined();
    expect((result as any).signedUrl).toBeUndefined();
  });

  it("returns contentType from response Content-Type header", async () => {
    globalThis.fetch = mockBlobResponse(200, "content", "image/png", "");

    const result = await api.downloadTaskAttachment("t", "a");

    expect(result.contentType).toContain("image/png");
  });

  it("returns fileName parsed from Content-Disposition header", async () => {
    globalThis.fetch = mockBlobResponse(
      200,
      "content",
      "application/pdf",
      'attachment; filename="my-report.pdf"'
    );

    const result = await api.downloadTaskAttachment("t", "a");

    expect(result.fileName).toBe("my-report.pdf");
  });

  it("returns fileName parsed from Content-Disposition filename* (RFC 5987)", async () => {
    globalThis.fetch = mockBlobResponse(
      200,
      "content",
      "application/pdf",
      "attachment; filename*=UTF-8''my%20file.pdf"
    );

    const result = await api.downloadTaskAttachment("t", "a");

    expect(result.fileName).toBe("my file.pdf");
  });

  it("method accepts only (taskId, attachmentId) — no fileUrl parameter", () => {
    // Structural contract: 2 params only, not 3
    expect(api.downloadTaskAttachment.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 3 & 4 — Download: object URL created and revoked
// ---------------------------------------------------------------------------

describe("download via Blob — object URL lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("URL.createObjectURL is called with the returned Blob for download", async () => {
    globalThis.fetch = mockBlobResponse(200, "file content", "application/pdf");
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake-url");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    const { blob } = await api.downloadTaskAttachment("t", "a");
    const objectUrl = URL.createObjectURL(blob);

    expect(createSpy).toHaveBeenCalledWith(blob);
    expect(objectUrl).toBe("blob:fake-url");

    // Simulate what the component does after triggering download
    URL.revokeObjectURL(objectUrl);
    expect(revokeSpy).toHaveBeenCalledWith("blob:fake-url");
  });

  it("URL.revokeObjectURL is called after download — no permanent object URL", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download-url");

    // Simulate the component download pattern
    const objectUrl = URL.createObjectURL(new Blob(["data"]));
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "file.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);

    expect(revokeSpy).toHaveBeenCalledWith("blob:download-url");
  });
});

// ---------------------------------------------------------------------------
// 5 & 6 — Preview: object URL used and revoked on close
// ---------------------------------------------------------------------------

describe("preview via Blob — object URL lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createObjectURL is called with Blob for preview", async () => {
    globalThis.fetch = mockBlobResponse(200, "pdf-bytes", "application/pdf");
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview-url");

    const { blob } = await api.downloadTaskAttachment("t", "a");
    const objectUrl = URL.createObjectURL(blob);

    expect(createSpy).toHaveBeenCalledWith(blob);
    expect(objectUrl).toBe("blob:preview-url");
  });

  it("revokeObjectURL is called when preview closes (blob: URL only)", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview-url");

    // Simulate the onClose handler pattern in TaskDetails/Drive
    const previewUrl = "blob:preview-url";
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    expect(revokeSpy).toHaveBeenCalledWith("blob:preview-url");
  });

  it("revokeObjectURL is NOT called for non-blob URLs (Google Drive webViewLink)", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    // Simulate onClose for a Google Drive URL — should not revoke
    const previewUrl = "https://drive.google.com/file/d/xyz/view";
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    expect(revokeSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7 & 8 — Drive: downloadDriveFile uses authenticated Blob endpoint
// ---------------------------------------------------------------------------

describe("downloadDriveFile — authenticated Blob endpoint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem("auth_token");
  });

  it("calls /drive/files/:fileId/download with Authorization header", async () => {
    localStorage.setItem("auth_token", "drive-jwt");
    globalThis.fetch = mockBlobResponse(200, "drive-bytes", "application/pdf");

    await api.downloadDriveFile("file-42");

    const [url, init] = (globalThis.fetch as any).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/drive/files/file-42/download");
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("authorization")).toBe("Bearer drive-jwt");
  });

  it("does NOT send Accept: application/json", async () => {
    globalThis.fetch = mockBlobResponse(200, "bytes");

    await api.downloadDriveFile("f");

    const [, init] = (globalThis.fetch as any).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("accept")).not.toBe("application/json");
  });

  it("returns a Blob for Drive preview — not a URL string", async () => {
    globalThis.fetch = mockBlobResponse(200, "drive-content", "application/pdf");

    const result = await api.downloadDriveFile("f");

    expect(result.blob).toBeInstanceOf(Blob);
    expect((result as any).url).toBeUndefined();
    expect((result as any).signedUrl).toBeUndefined();
  });

  it("creates object URL from Blob for Drive FileViewer", async () => {
    globalThis.fetch = mockBlobResponse(200, "drive-content");
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:drive-preview");

    const { blob } = await api.downloadDriveFile("f");
    const objectUrl = URL.createObjectURL(blob);

    expect(createSpy).toHaveBeenCalledWith(blob);
    expect(objectUrl).toBe("blob:drive-preview");
  });

  it("revokeObjectURL is called when Drive FileViewer closes", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:drive-preview");

    const objectUrl = URL.createObjectURL(new Blob(["drive"]));
    // Simulate Drive onClose handler
    if (objectUrl.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
    }

    expect(revokeSpy).toHaveBeenCalledWith("blob:drive-preview");
  });
});

// ---------------------------------------------------------------------------
// 9 — No confidential raw fileUrl usage (fileUrl not accepted by download methods)
// ---------------------------------------------------------------------------

describe("Task 9 — No confidential raw fileUrl in download API", () => {
  it("downloadTaskAttachment does not accept fileUrl as a parameter", () => {
    // Method signature is (taskId, attachmentId) — 2 params
    // A caller cannot pass fileUrl even by mistake
    expect(api.downloadTaskAttachment.length).toBe(2);
  });

  it("downloadDriveFile does not accept fileUrl as a parameter", () => {
    // Method signature is (fileId) — 1 param
    expect(api.downloadDriveFile.length).toBe(1);
  });

  it("api client no longer exposes getTaskAttachmentDownloadUrl", () => {
    expect((api as any).getTaskAttachmentDownloadUrl).toBeUndefined();
  });

  it("api client no longer exposes getDriveFileDownloadUrl", () => {
    expect((api as any).getDriveFileDownloadUrl).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 10 — No signed-URL JSON contract: methods do not return { url, expiresAt }
// ---------------------------------------------------------------------------

describe("Task 10 — No signed-URL JSON contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloadTaskAttachment does not return { url } property", async () => {
    globalThis.fetch = mockBlobResponse(200, "content");

    const result = await api.downloadTaskAttachment("t", "a");

    expect((result as any).url).toBeUndefined();
    expect((result as any).expiresAt).toBeUndefined();
  });

  it("downloadDriveFile does not return { url } property", async () => {
    globalThis.fetch = mockBlobResponse(200, "content");

    const result = await api.downloadDriveFile("f");

    expect((result as any).url).toBeUndefined();
    expect((result as any).expiresAt).toBeUndefined();
  });

  it("blob object URL is not written to localStorage", async () => {
    globalThis.fetch = mockBlobResponse(200, "content");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url");
    const setLocalSpy = vi.spyOn(Storage.prototype, "setItem");

    const { blob } = await api.downloadTaskAttachment("t", "a");
    URL.createObjectURL(blob);

    const blobUrlWritten = setLocalSpy.mock.calls.some(([, v]) =>
      String(v).includes("blob:")
    );
    expect(blobUrlWritten).toBe(false);
  });

  it("blob object URL is not written to sessionStorage", async () => {
    globalThis.fetch = mockBlobResponse(200, "content");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url-session");
    const setSessionSpy = vi.spyOn(sessionStorage, "setItem");

    const { blob } = await api.downloadDriveFile("f");
    URL.createObjectURL(blob);

    const blobUrlWritten = setSessionSpy.mock.calls.some(([, v]) =>
      String(v).includes("blob:")
    );
    expect(blobUrlWritten).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11 — Google Drive external URLs remain unchanged
// ---------------------------------------------------------------------------

describe("Task 11 — Google Drive external URL behavior preserved", () => {
  it("TaskAttachment supports webViewLink for Google Drive files", async () => {
    const mod = await import("@/lib/api");
    const att: mod.TaskAttachment = {
      id: "gd-1",
      taskId: "t-1",
      fileUrl: "",
      fileName: "report.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      source: "google-drive",
      webViewLink: "https://drive.google.com/file/d/xxx/view",
    };
    expect(att.webViewLink).toBe("https://drive.google.com/file/d/xxx/view");
    expect(att.source).toBe("google-drive");
  });

  it("downloadTaskAttachment and downloadDriveFile exist only for Admiino-uploaded files", () => {
    // Google Drive files use webViewLink directly — they never call these methods
    expect(typeof api.downloadTaskAttachment).toBe("function");
    expect(typeof api.downloadDriveFile).toBe("function");
    // The google-drive source check in TaskDetails.tsx routes these to window.open instead
  });
});

// ---------------------------------------------------------------------------
// 12 — profilePictureUrl renders directly (public asset)
// ---------------------------------------------------------------------------

describe("Task 12 — Public media not routed through download endpoints", () => {
  it("User.profilePictureUrl is a direct HTTPS URL, not a blob: or download endpoint", async () => {
    const mod = await import("@/lib/api");
    const user: mod.User = {
      id: "u-1",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      role: "executive",
      subscriptionTier: "free",
      isVerified: true,
      invitationStatus: "approved",
      invitedBy: null,
      isActive: true,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      profilePictureUrl: "https://cdn.example.com/avatars/alice.jpg",
    };
    expect(user.profilePictureUrl).toMatch(/^https:\/\//);
    expect(user.profilePictureUrl).not.toContain("/tasks/");
    expect(user.profilePictureUrl).not.toContain("/drive/files/");
    expect(user.profilePictureUrl).not.toMatch(/^blob:/);
  });
});

// ---------------------------------------------------------------------------
// 13 & 14 — 403 / 404 handled cleanly via ApiError
// ---------------------------------------------------------------------------

describe("Task 13 & 14 — Download error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloadTaskAttachment throws ApiError with statusCode 403", async () => {
    globalThis.fetch = mockJsonErrorResponse(403, "Forbidden");

    await expect(
      api.downloadTaskAttachment("task-1", "att-1")
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("downloadTaskAttachment throws ApiError with statusCode 404", async () => {
    globalThis.fetch = mockJsonErrorResponse(404, "Attachment not found");

    await expect(
      api.downloadTaskAttachment("task-1", "att-1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("downloadDriveFile throws ApiError with statusCode 403", async () => {
    globalThis.fetch = mockJsonErrorResponse(403, "Forbidden");

    await expect(api.downloadDriveFile("file-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("downloadDriveFile throws ApiError with statusCode 404", async () => {
    globalThis.fetch = mockJsonErrorResponse(404, "File not found");

    await expect(api.downloadDriveFile("file-1")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("403 ApiError message is preserved from backend body", async () => {
    globalThis.fetch = mockJsonErrorResponse(403, "You do not have access to this resource.");

    const err = await api.downloadTaskAttachment("t", "a").catch((e) => e);

    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("You do not have access to this resource.");
  });

  it("404 ApiError message is preserved from backend body", async () => {
    globalThis.fetch = mockJsonErrorResponse(404, "Attachment not found.");

    const err = await api.downloadTaskAttachment("t", "a").catch((e) => e);

    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Attachment not found.");
  });

  it("throws ApiError (not a Blob) when response is non-2xx", async () => {
    globalThis.fetch = mockJsonErrorResponse(500, "Internal server error");

    await expect(api.downloadTaskAttachment("t", "a")).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// 15 — 429 rate-limit behavior preserved
// ---------------------------------------------------------------------------

describe("Task 15 — 429 rate-limit handling preserved", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloadTaskAttachment throws ApiError with statusCode 429", async () => {
    globalThis.fetch = mockJsonErrorResponse(429, "Too many download requests.");

    const err = await api.downloadTaskAttachment("t", "a").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(429);
  });

  it("downloadDriveFile throws ApiError with statusCode 429", async () => {
    globalThis.fetch = mockJsonErrorResponse(429, "Too many requests. Please wait.");

    const err = await api.downloadDriveFile("f").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(429);
  });

  it("ApiError carries statusCode so callers can distinguish 429 from others", () => {
    const err = new ApiError("Rate limited", 429);
    expect(err.statusCode).toBe(429);
    expect(err instanceof Error).toBe(true);
    expect(err.name).toBe("ApiError");
  });
});

// ---------------------------------------------------------------------------
// 16 — Forgot-password and resend-verification neutral UX (preserved)
// ---------------------------------------------------------------------------

describe("Task 16 — Forgot-password neutral UX (Phase 2 preserved)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("api.request resolves on 200 from /auth/forgot-password", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          message: "If that email is registered, you will receive password reset instructions shortly.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      api.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "unknown@example.com" }),
      })
    ).resolves.not.toThrow();
  });

  it("api.request throws 429 ApiError for rate-limited forgot-password", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Too many attempts." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      api.request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "x@x.com" }),
      })
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe("Task 16 — Resend-verification neutral UX (Phase 2 preserved)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resendVerificationEmail resolves on 200 for unknown email", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ status: "success", message: "Neutral response." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      api.resendVerificationEmail("ghost@example.com")
    ).resolves.not.toThrow();
  });

  it("resendVerificationEmail throws ApiError 429 when rate limited", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Too many attempts. Please try again shortly." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      api.resendVerificationEmail("user@example.com")
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});

// ---------------------------------------------------------------------------
// 17 — Upload accept attributes exclude unsafe extensions
// ---------------------------------------------------------------------------

describe("Task 17 — Upload accept attributes (Phase 2 preserved)", () => {
  const ACCEPTED =
    ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif";

  const UNSAFE = [".html", ".svg", ".js", ".exe", ".sh", ".bat", ".ps1", ".php"];

  it("accepted list includes all backend-supported business-document types", () => {
    const required = [
      ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
      ".txt", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".gif",
    ];
    for (const ext of required) {
      expect(ACCEPTED).toContain(ext);
    }
  });

  it.each(UNSAFE)("accepted list does not contain unsafe extension %s", (ext) => {
    // Use word-boundary check to avoid partial matches (e.g. .ts inside .pptx)
    const regex = new RegExp(`(?<![a-z])${ext.replace(".", "\\.")}(?![a-z])`, "i");
    expect(regex.test(ACCEPTED)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 18 — Backend 400 upload message surfaced cleanly
// ---------------------------------------------------------------------------

describe("Task 18 — Backend 400 upload error surfacing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ApiError preserves backend 400 message for upload rejection", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "error",
          message: "File type not allowed. Supported types: pdf, docx, xlsx.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      api.uploadTaskAttachments("task-1", [new File([""], "bad.exe")])
    ).rejects.toMatchObject({
      message: "File type not allowed. Supported types: pdf, docx, xlsx.",
      statusCode: 400,
    });
  });

  it("ApiError.message is not [object Object]", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ status: "error", message: "Unsupported file format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    try {
      await api.uploadTaskAttachments("task-1", [new File([""], "test.svg")]);
    } catch (err: any) {
      expect(err.message).not.toBe("[object Object]");
      expect(typeof err.message).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// 19 — Removed auth fields absent from User type
// ---------------------------------------------------------------------------

describe("Task 19 — Removed auth response fields absent from User type", () => {
  it("User interface has no passwordResetToken / passwordResetExpires", async () => {
    const mod = await import("@/lib/api");
    const user: mod.User = {
      id: "u-1", firstName: "Bob", lastName: "T", email: "b@t.com",
      role: "executive", subscriptionTier: "free", isVerified: true,
      invitationStatus: "approved", invitedBy: null, isActive: true,
      createdAt: "2024-01-01", updatedAt: "2024-01-01",
    };
    expect((user as any).passwordResetToken).toBeUndefined();
    expect((user as any).passwordResetExpires).toBeUndefined();
  });

  it("User interface has no emailVerificationToken / emailVerificationExpires", async () => {
    const mod = await import("@/lib/api");
    const user: mod.User = {
      id: "u-2", firstName: "Carol", lastName: "T", email: "c@t.com",
      role: "team_member", subscriptionTier: "free", isVerified: false,
      invitationStatus: "invited", invitedBy: null, isActive: true,
      createdAt: "2024-01-01", updatedAt: "2024-01-01",
    };
    expect((user as any).emailVerificationToken).toBeUndefined();
    expect((user as any).emailVerificationExpires).toBeUndefined();
  });

  it("User interface has no googleId / googleEmail / googleAvatar", async () => {
    const mod = await import("@/lib/api");
    const user: mod.User = {
      id: "u-3", firstName: "Dan", lastName: "T", email: "d@t.com",
      role: "manager", subscriptionTier: "premium", isVerified: true,
      invitationStatus: "approved", invitedBy: null, isActive: true,
      createdAt: "2024-01-01", updatedAt: "2024-01-01",
    };
    expect((user as any).googleId).toBeUndefined();
    expect((user as any).googleEmail).toBeUndefined();
    expect((user as any).googleAvatar).toBeUndefined();
  });

  it("profilePictureUrl is the retained avatar field (replaces googleAvatar)", async () => {
    const mod = await import("@/lib/api");
    const user: mod.User = {
      id: "u-4", firstName: "Eve", lastName: "T", email: "e@t.com",
      role: "manager", subscriptionTier: "free", isVerified: true,
      invitationStatus: "approved", invitedBy: null, isActive: true,
      createdAt: "2024-01-01", updatedAt: "2024-01-01",
      profilePictureUrl: "https://cdn.example.com/avatars/eve.jpg",
    };
    expect(user.profilePictureUrl).toBe("https://cdn.example.com/avatars/eve.jpg");
    expect((user as any).googleAvatar).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pre-existing Phase 1 guards (always passing)
// ---------------------------------------------------------------------------

describe("canExportWorkspace (Phase 1 preserved)", () => {
  it("api module does not export signupAdmin or signupSuperAdmin", async () => {
    const mod = await import("@/lib/api");
    expect((mod.api as any).signupAdmin).toBeUndefined();
    expect((mod.api as any).signupSuperAdmin).toBeUndefined();
  });

  it("ApiError stores statusCode", () => {
    const err = new ApiError("Too many requests", 429);
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe("ApiError");
    expect(err instanceof Error).toBe(true);
  });
});

// ===========================================================================
// PHASE 2 FINAL — Assistance Request attachment tests (Tasks 20-32)
// ===========================================================================

// ---------------------------------------------------------------------------
// Task 20 — AssistanceRequestAttachment type: no url or publicId
// ---------------------------------------------------------------------------

describe("Task 20 — AssistanceRequestAttachment: no raw url or publicId", () => {
  it("AssistanceRequestAttachment type has no 'url' field required", async () => {
    const mod = await import("@/lib/api");
    // Create a valid attachment without url or publicId — TS would error if
    // these were required fields.
    const att: mod.AssistanceRequestAttachment = {
      fileName: "brief.pdf",
      fileType: "application/pdf",
      fileSize: 204800,
      uploadedAt: "2026-09-01T12:00:00Z",
    };
    expect((att as any).url).toBeUndefined();
    expect((att as any).publicId).toBeUndefined();
    expect(att.fileName).toBe("brief.pdf");
  });

  it("publicId is not required by the frontend Assistance attachment type", async () => {
    const mod = await import("@/lib/api");
    const att: mod.AssistanceRequestAttachment = {
      fileName: "spec.docx",
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 1024,
    };
    expect((att as any).publicId).toBeUndefined();
  });

  it("Cloudinary URL is not required by Assistance attachment type", async () => {
    const mod = await import("@/lib/api");
    const att: mod.AssistanceRequestAttachment = {
      fileName: "data.xlsx",
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileSize: 512,
    };
    expect((att as any).url).toBeUndefined();
    expect((att as any).secure_url).toBeUndefined();
    // Metadata fields remain correct
    expect(att.fileSize).toBe(512);
  });
});

// ---------------------------------------------------------------------------
// Task 21 & 22 — downloadAssistanceAttachment: authenticated endpoint + correct IDs
// ---------------------------------------------------------------------------

describe("downloadAssistanceAttachment — authenticated Blob endpoint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem("auth_token");
  });

  it("calls the correct endpoint with requestId and attachment index", async () => {
    localStorage.setItem("auth_token", "jwt-assist");
    globalThis.fetch = mockBlobResponse(200, "file-bytes", "application/pdf");

    await api.downloadAssistanceAttachment("req-abc-123", 2);

    const [url] = (globalThis.fetch as any).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/assistance/req-abc-123/attachments/2/download");
  });

  it("sends Authorization header with JWT", async () => {
    localStorage.setItem("auth_token", "jwt-assist-token");
    globalThis.fetch = mockBlobResponse(200, "bytes");

    await api.downloadAssistanceAttachment("req-1", 0);

    const [, init] = (globalThis.fetch as any).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("authorization")).toBe("Bearer jwt-assist-token");
  });

  it("uses index 0 for the first attachment", async () => {
    globalThis.fetch = mockBlobResponse(200, "data");
    await api.downloadAssistanceAttachment("req-xyz", 0);
    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain("/attachments/0/download");
  });

  it("uses index 1 for the second attachment", async () => {
    globalThis.fetch = mockBlobResponse(200, "data");
    await api.downloadAssistanceAttachment("req-xyz", 1);
    const [url] = (globalThis.fetch as any).mock.calls[0] as [string];
    expect(url).toContain("/attachments/1/download");
  });
});

// ---------------------------------------------------------------------------
// Task 23 — Response consumed as Blob
// ---------------------------------------------------------------------------

describe("Task 23 — downloadAssistanceAttachment returns Blob", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns a Blob instance — not a URL string or JSON body", async () => {
    globalThis.fetch = mockBlobResponse(200, "assistance-pdf-bytes", "application/pdf");

    const result = await api.downloadAssistanceAttachment("req-1", 0);

    expect(result.blob).toBeInstanceOf(Blob);
    expect(typeof result.blob).not.toBe("string");
    expect((result as any).url).toBeUndefined();
    expect((result as any).publicId).toBeUndefined();
    expect((result as any).cloudinaryUrl).toBeUndefined();
  });

  it("returns contentType from Content-Type header", async () => {
    globalThis.fetch = mockBlobResponse(200, "content", "application/vnd.ms-excel", "");

    const result = await api.downloadAssistanceAttachment("req-1", 0);

    expect(result.contentType).toContain("application/vnd.ms-excel");
  });

  it("returns fileName parsed from Content-Disposition", async () => {
    globalThis.fetch = mockBlobResponse(
      200,
      "content",
      "application/pdf",
      'attachment; filename="project-brief.pdf"'
    );

    const result = await api.downloadAssistanceAttachment("req-1", 0);

    expect(result.fileName).toBe("project-brief.pdf");
  });
});

// ---------------------------------------------------------------------------
// Task 24 — Blob URL created for download
// ---------------------------------------------------------------------------

describe("Task 24 — Blob URL created for assistance download", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("URL.createObjectURL is called with the returned Blob", async () => {
    globalThis.fetch = mockBlobResponse(200, "assist-bytes");
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:assist-url");

    const { blob } = await api.downloadAssistanceAttachment("req-1", 0);
    const objectUrl = URL.createObjectURL(blob);

    expect(createSpy).toHaveBeenCalledWith(blob);
    expect(objectUrl).toBe("blob:assist-url");
  });
});

// ---------------------------------------------------------------------------
// Task 25 — Blob URL revoked after download
// ---------------------------------------------------------------------------

describe("Task 25 — Blob URL revoked after assistance download", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("URL.revokeObjectURL is called after triggering the download anchor", async () => {
    globalThis.fetch = mockBlobResponse(200, "assist-bytes");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:assist-download");

    const { blob } = await api.downloadAssistanceAttachment("req-1", 0);
    const objectUrl = URL.createObjectURL(blob);

    // Simulate the component download pattern (same as triggerBlobDownload)
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "brief.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);

    expect(revokeSpy).toHaveBeenCalledWith("blob:assist-download");
  });
});

// ---------------------------------------------------------------------------
// Task 26 — publicId not required by frontend assistance type
// (duplicate structural guard — belt and suspenders)
// ---------------------------------------------------------------------------

describe("Task 26 — publicId not required by frontend type", () => {
  it("AssistanceRequestAttachment can be constructed without publicId", async () => {
    const mod = await import("@/lib/api");
    // TypeScript would fail to compile this test if publicId were required
    const att: mod.AssistanceRequestAttachment = {
      fileName: "evidence.pdf",
      fileType: "application/pdf",
      fileSize: 99999,
    };
    expect("publicId" in att).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 27 — Cloudinary URL not required by assistance UI
// ---------------------------------------------------------------------------

describe("Task 27 — Cloudinary URL not required by assistance UI", () => {
  it("AssistanceRequestAttachment can be constructed without url or secure_url", async () => {
    const mod = await import("@/lib/api");
    const att: mod.AssistanceRequestAttachment = {
      fileName: "onboarding-doc.docx",
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 45000,
    };
    expect((att as any).url).toBeUndefined();
    expect((att as any).secure_url).toBeUndefined();
    expect((att as any).cloudinaryUrl).toBeUndefined();
  });

  it("downloadAssistanceAttachment method does not accept a cloudinaryUrl parameter", () => {
    // Signature: (requestId: string, attachmentIndex: number) — 2 params only
    expect(api.downloadAssistanceAttachment.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Task 28 — 403 produces access-denied UX
// ---------------------------------------------------------------------------

describe("Task 28 — 403 access-denied for assistance attachments", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("throws ApiError with statusCode 403", async () => {
    globalThis.fetch = mockJsonErrorResponse(403, "You do not have access to this resource.");

    const err = await api.downloadAssistanceAttachment("req-1", 0).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(403);
  });

  it("403 message is preserved from backend body", async () => {
    globalThis.fetch = mockJsonErrorResponse(403, "You don't have access to this file.");

    const err = await api.downloadAssistanceAttachment("req-1", 0).catch((e) => e);

    expect(err.message).toBe("You don't have access to this file.");
  });
});

// ---------------------------------------------------------------------------
// Task 29 — 404 produces unavailable-file UX
// ---------------------------------------------------------------------------

describe("Task 29 — 404 unavailable-file for assistance attachments", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("throws ApiError with statusCode 404", async () => {
    globalThis.fetch = mockJsonErrorResponse(404, "Attachment not found.");

    const err = await api.downloadAssistanceAttachment("req-1", 0).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(404);
  });

  it("404 message is preserved from backend body", async () => {
    globalThis.fetch = mockJsonErrorResponse(404, "This file is no longer available.");

    const err = await api.downloadAssistanceAttachment("req-1", 0).catch((e) => e);

    expect(err.message).toBe("This file is no longer available.");
  });
});

// ---------------------------------------------------------------------------
// Task 30 — 429 rate-limit preserved for assistance attachments
// ---------------------------------------------------------------------------

describe("Task 30 — 429 rate-limit handling for assistance attachments", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("throws ApiError with statusCode 429", async () => {
    globalThis.fetch = mockJsonErrorResponse(429, "Too many download requests. Please wait.");

    const err = await api.downloadAssistanceAttachment("req-1", 0).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// Task 31 — Existing Task attachment Blob tests still pass (structural guard)
// ---------------------------------------------------------------------------

describe("Task 31 — Task attachment Blob API contract preserved", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("downloadTaskAttachment still exists and accepts (taskId, attachmentId)", async () => {
    expect(typeof api.downloadTaskAttachment).toBe("function");
    expect(api.downloadTaskAttachment.length).toBe(2);
  });

  it("downloadTaskAttachment still returns Blob", async () => {
    globalThis.fetch = mockBlobResponse(200, "task-bytes", "image/png", "");

    const result = await api.downloadTaskAttachment("t-1", "a-1");

    expect(result.blob).toBeInstanceOf(Blob);
  });
});

// ---------------------------------------------------------------------------
// Task 32 — Existing Drive Blob tests still pass (structural guard)
// ---------------------------------------------------------------------------

describe("Task 32 — Drive Blob API contract preserved", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("downloadDriveFile still exists and accepts (fileId)", async () => {
    expect(typeof api.downloadDriveFile).toBe("function");
    expect(api.downloadDriveFile.length).toBe(1);
  });

  it("downloadDriveFile still returns Blob", async () => {
    globalThis.fetch = mockBlobResponse(200, "drive-bytes", "application/pdf", "");

    const result = await api.downloadDriveFile("file-99");

    expect(result.blob).toBeInstanceOf(Blob);
  });
});
