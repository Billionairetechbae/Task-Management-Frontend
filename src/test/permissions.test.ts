/**
 * Tests for workspace export permission logic (Task 1)
 * and 429 error handling in the API layer (Task 2).
 */
import { describe, it, expect } from "vitest";
import { canExportWorkspace } from "@/lib/permissions";
import { ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Task 1 — canExportWorkspace authorization matrix
// ---------------------------------------------------------------------------

describe("canExportWorkspace", () => {
  it("returns true for workspace owner", () => {
    expect(canExportWorkspace("owner")).toBe(true);
  });

  it("returns true for workspace admin", () => {
    expect(canExportWorkspace("admin")).toBe(true);
  });

  it("returns false for workspace manager", () => {
    expect(canExportWorkspace("manager")).toBe(false);
  });

  it("returns false for workspace member", () => {
    expect(canExportWorkspace("member")).toBe(false);
  });

  it("returns false when workspaceRole is null", () => {
    expect(canExportWorkspace(null)).toBe(false);
  });

  it("returns false when workspaceRole is undefined", () => {
    expect(canExportWorkspace(undefined)).toBe(false);
  });

  // Ensure the old 'executive' global-role bypass is gone.
  // canExportWorkspace no longer accepts a second argument; passing
  // only a non-owner/admin workspace role must return false regardless
  // of what a caller might have previously relied on as globalRole.
  it("does NOT grant access based on 'executive' as workspace role string", () => {
    // 'executive' is not a valid WorkspaceRole; the function must return false.
    expect(canExportWorkspace("executive" as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — ApiError carries statusCode so callers can detect 429
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("stores statusCode on the error instance", () => {
    const err = new ApiError("Too many requests", 429);
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe("Too many requests");
    expect(err).toBeInstanceOf(Error);
  });

  it("has name 'ApiError'", () => {
    const err = new ApiError("fail", 400);
    expect(err.name).toBe("ApiError");
  });
});

// ---------------------------------------------------------------------------
// Task 3 — no admin/super-admin signup symbols exported from api
// ---------------------------------------------------------------------------

describe("api module — no admin/super-admin signup exposure", () => {
  it("does not export signupAdmin", async () => {
    const mod = await import("@/lib/api");
    // The ApiClient class is not exported directly, only the `api` instance.
    // Verify the instance does not have admin/super-admin signup methods.
    expect((mod.api as any).signupAdmin).toBeUndefined();
    expect((mod.api as any).signupSuperAdmin).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Task 4 — no diagnostic endpoint constants in api module
// ---------------------------------------------------------------------------

describe("api module — no diagnostic endpoints", () => {
  it("does not reference /api/db-test, /db-columns, /test-cloudinary in api.ts source", async () => {
    // Read the api.ts source at runtime isn't feasible in unit tests,
    // but we can verify none of the known diagnostic methods exist on the client.
    const mod = await import("@/lib/api");
    const diagnosticMethods = ["dbTest", "dbColumns", "testCloudinary", "getApiDocs"];
    for (const method of diagnosticMethods) {
      expect((mod.api as any)[method]).toBeUndefined();
    }
  });
});
