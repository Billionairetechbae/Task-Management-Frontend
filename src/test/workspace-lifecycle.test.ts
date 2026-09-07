import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { expiryLabel, paginateWorkspaces } from "@/lib/workspaceLifecycle";

const workspaces = Array.from({ length: 12 }, (_, index) => ({ id: String(index + 1), name: `Workspace ${index + 1}` }));

describe("workspace switcher pagination", () => {
  it("shows at most five workspaces initially and no load-more need at five", () => {
    expect(paginateWorkspaces(workspaces.slice(0, 5), "1", "", 5).visible).toHaveLength(5);
    expect(paginateWorkspaces(workspaces.slice(0, 5), "1", "", 5).matches).toHaveLength(5);
  });

  it("loads the next five without duplicating the current workspace", () => {
    const first = paginateWorkspaces(workspaces, "12", "", 5).visible;
    const second = paginateWorkspaces(workspaces, "12", "", 10).visible;
    expect(first).toHaveLength(5);
    expect(second).toHaveLength(10);
    expect(second.filter((workspace) => workspace.id === "12")).toHaveLength(1);
    expect(first[0].id).toBe("12");
  });

  it("filters case-insensitively by workspace name", () => {
    expect(paginateWorkspaces(workspaces, "1", "SPACE 11", 5).visible.map((workspace) => workspace.id)).toEqual(["11"]);
  });
});

describe("trash expiry", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");
  it("uses expiresAt for days remaining", () => expect(expiryLabel("2026-09-30T12:00:00.000Z", now)).toBe("23 days remaining"));
  it("shows deletes today under 24 hours", () => expect(expiryLabel("2026-09-08T11:00:00.000Z", now)).toBe("Deletes today"));
});

describe("workspace lifecycle and trash API contract", () => {
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it("sends auth and workspace headers for leave with owner handover", async () => {
    localStorage.setItem("auth_token", "token");
    localStorage.setItem("activeCompanyId", "workspace-1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock;
    await api.leaveWorkspace("workspace-1", { newOwnerUserId: "user-2", confirmHandover: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/workspaces/workspace-1/leave");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer token");
    expect(new Headers(options.headers).get("x-company-id")).toBe("workspace-1");
    expect(JSON.parse(options.body)).toEqual({ newOwnerUserId: "user-2", confirmHandover: true });
  });

  it("uses soft-delete and unified Trash endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success", data: { items: [] } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock;
    await api.deleteProject("project-1");
    await api.getTrash();
    await api.restoreTrashItem("task", "task-1");
    await api.permanentlyDeleteTrashItem("file", "file-1");
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining([
      expect.stringContaining("/projects/project-1"), expect.stringContaining("/trash"),
      expect.stringContaining("/trash/task/task-1/restore"), expect.stringContaining("/trash/file/file-1/permanent"),
    ]));
  });

  it("uploads only the logo file and never sends logoPublicId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock;
    await api.uploadWorkspaceLogo("workspace-1", new File(["image"], "logo.png", { type: "image/png" }));
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("logo")).toBeInstanceOf(File);
    expect(body.has("logoPublicId")).toBe(false);
  });
});
