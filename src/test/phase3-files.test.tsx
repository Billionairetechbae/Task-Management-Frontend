// @vitest-environment-options {"settings":{"disableIframePageLoading":true}}
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook, act } from "@testing-library/react";
import { api, ApiError, triggerBlobDownload } from "@/lib/api";
import AttachmentPreview from "@/components/AttachmentPreview";
import FileViewer from "@/components/FileViewer";
import { usePreviewBlobUrl } from "@/hooks/usePreviewBlobUrl";
import { readFileSync } from "node:fs";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });
const flows = [
  ["Task", () => api.downloadTaskAttachment("t", "a"), "/tasks/t/attachments/a/download"],
  ["Drive", () => api.downloadDriveFile("f"), "/drive/files/f/download"],
  ["Assistance", () => api.downloadAssistanceAttachment("r", 0), "/assistance/r/attachments/0/download"],
] as const;
for (const [label, download, endpoint] of flows) describe(label, () => {
  it.each(["docx", "xlsx", "pptx"])("downloads metadata filename with .%s when header is unreadable", async ext => {
    localStorage.setItem("auth_token", "test-token");
    localStorage.setItem("activeCompanyId", "workspace");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bytes"));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    let saved = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { saved = this.download; expect(this.isConnected).toBe(true); });
    vi.useFakeTimers();
    const result = await download();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.fileName).toBe("");
    triggerBlobDownload(result.blob, result.fileName || `Budget Model 日本語.${ext}`);
    expect(saved).toBe(`Budget Model 日本語.${ext}`);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:download");
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining(endpoint), { method: "GET", headers: { Authorization: "Bearer test-token", "x-company-id": "workspace" } });
  });
  it.each([
    ['attachment; filename="Budget Model.xlsx"', 'Budget Model.xlsx'],
    ["attachment; filename*=UTF-8''Budget%20Model%20%E6%97%A5.xlsx", 'Budget Model 日.xlsx'],
    ["attachment; filename=old.xlsx; filename*=UTF-8''New%20Name.xlsx", 'New Name.xlsx'],
    ['attachment; filename="Budget Model.xlsx"; filename*=UTF-8\'\'%ZZ', 'Budget Model.xlsx'],
  ])("parses %s", async (header, expected) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bytes", { headers: { "Content-Disposition": header } }));
    expect((await download()).fileName).toBe(expected);
  });
  it.each([401, 403, 404, 429, 500])("throws ApiError for %s", async status => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("error", { status }));
    await expect(download()).rejects.toBeInstanceOf(ApiError);
  });
});
for (const viewer of ["Task", "Drive"]) describe(`${viewer} preview`, () => {
  const preview = (name: string, type: string, url = "blob:preview") => viewer === "Task"
    ? render(<AttachmentPreview url={url} type={type} name={name} onClose={() => {}} />)
    : render(<FileViewer file={{ fileUrl: url, fileName: name, fileType: type }} onClose={() => {}} />);
  it.each(["docx", "xlsx", "pptx"])("Office .%s has named Open and Download and no iframe", ext => {
    const { container, getByText } = preview(`Budget Model.${ext}`, "application/octet-stream");
    expect(getByText("Preview not available for this file type.")).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
    container.querySelectorAll("a").forEach(a => expect(a.download).toBe(`Budget Model.${ext}`));
  });
  it.each([["report.pdf", "application/pdf", "iframe"], ["photo.png", "image/png", "img"]])("renders %s from Blob", (name, type, tag) => {
    expect(preview(name, type).container.querySelector(tag)?.getAttribute("src")).toBe("blob:preview");
  });
  it("keeps external Google Drive Open links unchanged", () => {
    const url = "https://drive.google.com/file/d/example/view";
    const { container } = preview("report.docx", "application/octet-stream", url);
    const open = container.querySelector('a[target="_blank"]');
    expect(open?.getAttribute("href")).toBe(url);
    expect(open?.hasAttribute("download")).toBe(false);
  });
});
it("cleans preview URLs on replacement, close, unmount and late response", () => {
  let count = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:${++count}`);
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const { result, unmount } = renderHook(usePreviewBlobUrl);
  const blob = new Blob(["bytes"]);
  act(() => { result.current.create(blob); result.current.create(blob); });
  expect(revoke).toHaveBeenCalledWith("blob:1");
  act(() => result.current.clear());
  expect(revoke).toHaveBeenCalledWith("blob:2");
  act(() => result.current.create(blob));
  const create = result.current.create;
  unmount();
  expect(revoke).toHaveBeenCalledWith("blob:3");
  create(blob);
  expect(revoke).toHaveBeenCalledWith("blob:4");
});
it("confidential metadata does not require storage URLs or identifiers", () => {
  const source = readFileSync("src/lib/api.ts", "utf8");
  for (const type of ["TaskAttachment", "FolderFile", "AssistanceRequestAttachment"]) {
    const body = source.split(`export interface ${type} {`)[1].split("\n}")[0];
    expect(body).not.toMatch(/fileUrl|publicId|secure_url/);
  }
  for (const path of ["src/pages/TaskDetails.tsx", "src/pages/ExecutiveAssistanceRequests.tsx", "src/components/dashboard/TaskEditDrawer.tsx"]) {
    expect(readFileSync(path, "utf8")).not.toMatch(/\.fileUrl|\.publicId|secure_url|res\.cloudinary\.com/);
  }
});
it("public profile and project images remain direct URL assets", () => {
  expect(readFileSync("src/pages/Profile.tsx", "utf8")).toContain("src={user.profilePictureUrl}");
  expect(readFileSync("src/pages/Projects.tsx", "utf8")).toContain("src={p.logoUrl}");
});
it("Task and Drive preview owners wire close cleanup and Blob creation", () => {
  for (const path of ["src/pages/TaskDetails.tsx", "src/pages/Drive.tsx"]) {
    const source = readFileSync(path, "utf8");
    expect(source).toContain("usePreviewBlobUrl()");
    expect(source).toContain("previewBlob.create(blob)");
    expect(source).toContain("previewBlob.clear()");
  }
});
