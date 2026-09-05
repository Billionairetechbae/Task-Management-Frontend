import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import GoogleDrivePickerDialog from "@/components/tasks/GoogleDrivePickerDialog";
import { useGooglePicker } from "@/hooks/useGooglePicker";
import { googleIntegrationService } from "@/services/googleIntegrationService";

const recentFile = vi.hoisted(() => ({ fileId: "recent-1", name: "Recent budget.xlsx", mimeType: "application/octet-stream", webViewLink: "https://drive.google.com/file/d/recent-1/view" }));
vi.mock("@/hooks/useGoogleIntegration", () => ({ useGoogleIntegration: () => ({ isConnected: true, statusLoading: false }) }));
vi.mock("@/hooks/useGoogleDriveFiles", () => ({ useGoogleDriveFiles: () => ({ files: [recentFile], query: "", loading: false, refresh: vi.fn(), setQuery: vi.fn(), setFolderId: vi.fn() }) }));

// Simulate the SDK's body-mounted DOM and terminal callbacks. Geometry is also
// checked separately in Chrome using Google's real SDK (no live account token).
let instances: FakePicker[];
let builders: FakeBuilder[];
class FakePicker {
  dialog = document.createElement("div");
  backdrop = document.createElement("div");
  constructor(public callback: (data: google.picker.PickerResponse) => void) {
    this.dialog.className = "picker-dialog";
    this.dialog.style.cssText = "position:absolute;top:1800px;left:0;z-index:1001;width:750px;height:480px";
    this.dialog.innerHTML = '<iframe class="picker-dialog-frame" title="Google Drive picker"></iframe>';
    this.backdrop.className = "picker-dialog-bg";
    this.backdrop.style.cssText = "position:absolute;z-index:1000";
    instances.push(this);
  }
  setVisible = vi.fn((visible: boolean) => { if (visible) document.body.append(this.backdrop, this.dialog); });
  dispose = vi.fn(() => { this.dialog.remove(); this.backdrop.remove(); });
}
class FakeView {
  includeFolders = false;
  selectFolder = true;
  constructor(public id?: string) {}
  setIncludeFolders(value: boolean) { this.includeFolders = value; return this; }
  setSelectFolderEnabled(value: boolean) { this.selectFolder = value; return this; }
}
class FakeBuilder {
  views: FakeView[] = [];
  callback!: (data: google.picker.PickerResponse) => void;
  token = ""; key = "";
  constructor() { builders.push(this); }
  addView(view: FakeView) { this.views.push(view); return this; }
  enableFeature() { return this; }
  setOAuthToken(value: string) { this.token = value; return this; }
  setDeveloperKey(value: string) { this.key = value; return this; }
  setTitle() { return this; }
  setCallback(value: typeof this.callback) { this.callback = value; return this; }
  build() { return new FakePicker(this.callback); }
}

beforeEach(() => {
  instances = []; builders = [];
  window._gapiScriptInjected = true;
  window._gapiPickerReady = true;
  vi.stubEnv("VITE_GOOGLE_API_KEY", "test-key");
  vi.stubGlobal("google", { picker: { PickerBuilder: FakeBuilder, DocsView: FakeView, Feature: { SUPPORT_DRIVES: "drives" }, ViewId: { DOCS: "docs" }, Action: { PICKED: "picked", CANCEL: "cancel" }, Response: { ACTION: "action", DOCUMENTS: "docs" }, Document: { ID: "id", NAME: "name", MIME_TYPE: "mimeType", URL: "url", THUMBNAILS: "thumbnails" } } });
  vi.spyOn(googleIntegrationService, "getPickerToken").mockResolvedValue({ accessToken: "test-token" });
});
afterEach(() => { cleanup(); instances.forEach(p => p.dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); delete window._gapiScriptInjected; delete window._gapiPickerReady; });

async function browse() {
  fireEvent.click(screen.getByRole("button", { name: "Browse Google Drive" }));
  await waitFor(() => expect(instances).toHaveLength(1));
  expect(instances[0].setVisible).toHaveBeenCalledWith(true);
  return instances[0];
}

it("Browse creates the body-mounted iframe using the existing token, key and Drive views", async () => {
  const error = vi.spyOn(console, "error");
  render(<GoogleDrivePickerDialog open onOpenChange={vi.fn()} onSelect={vi.fn()} />);
  const picker = await browse();
  expect(picker.dialog.parentElement).toBe(document.body);
  expect(picker.dialog.querySelector("iframe")).toBeVisible();
  expect(builders[0].token).toBe("test-token");
  expect(Boolean(builders[0].key)).toBe(true);
  expect(builders[0].views).toHaveLength(2);
  expect(builders[0].views[0].includeFolders).toBe(true);
  expect(builders[0].views[0].selectFolder).toBe(false);
  expect(error).not.toHaveBeenCalled();
});
it("positions the dialog above its backdrop, independently of page scroll", async () => {
  const style = document.createElement("style");
  style.textContent = readFileSync("src/index.css", "utf8").split("/* Google mounts Picker")[1].split("*/")[1];
  document.head.append(style);
  render(<GoogleDrivePickerDialog open onOpenChange={vi.fn()} onSelect={vi.fn()} />);
  const picker = await browse();
  // Inline SDK geometry cannot override these scoped viewport rules.
  expect(style.textContent).toContain("position: fixed !important");
  expect(style.textContent).toContain("top: 50% !important");
  expect(style.textContent).toContain("100dvh - 2rem");
  expect(Number(getComputedStyle(picker.dialog).zIndex)).toBeGreaterThan(Number(getComputedStyle(picker.backdrop).zIndex));
  style.remove();
});
it("cancel removes the Google iframe and backdrop, then allows repeated opens", async () => {
  render(<GoogleDrivePickerDialog open onOpenChange={vi.fn()} onSelect={vi.fn()} />);
  for (let index = 0; index < 3; index++) {
    fireEvent.click(screen.getByRole("button", { name: "Browse Google Drive" }));
    await waitFor(() => expect(instances).toHaveLength(index + 1));
    expect(document.querySelectorAll(".picker-dialog-bg")).toHaveLength(1);
    act(() => instances[index].callback({ action: "cancel" }));
    await screen.findByRole("button", { name: "Browse Google Drive" });
    expect(document.querySelector(".picker-dialog, .picker-dialog-bg")).toBeNull();
  }
});
it("selection keeps the Google URL and attachment contract and disposes all picker DOM", async () => {
  const select = vi.fn(); const close = vi.fn();
  render(<GoogleDrivePickerDialog open onOpenChange={close} onSelect={select} />);
  const picker = await browse();
  act(() => picker.callback({ action: "picked", docs: [{ id: "f", name: "Report.docx", mimeType: "application/octet-stream", url: "https://drive.google.com/file/d/f/view" }] }));
  await waitFor(() => expect(select).toHaveBeenCalledWith({ fileId: "f", name: "Report.docx", mimeType: "application/octet-stream", webViewLink: "https://drive.google.com/file/d/f/view", thumbnailLink: undefined, source: "google-drive" }));
  expect(close).toHaveBeenCalledWith(false);
  expect(document.querySelector(".picker-dialog, .picker-dialog-bg")).toBeNull();
});
it("navigation and iframe focus do not dismiss the picker", async () => {
  const close = vi.fn(); const select = vi.fn();
  render(<GoogleDrivePickerDialog open onOpenChange={close} onSelect={select} />);
  const picker = await browse();
  act(() => picker.callback({ action: "loaded" }));
  fireEvent.focusIn(picker.dialog.querySelector("iframe")!);
  expect(picker.dispose).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
});
it("Escape disposes the picker and clears the loading state", async () => {
  render(<GoogleDrivePickerDialog open onOpenChange={vi.fn()} onSelect={vi.fn()} />);
  await browse();
  fireEvent.keyDown(document, { key: "Escape" });
  await screen.findByRole("button", { name: "Browse Google Drive" });
  expect(document.querySelector(".picker-dialog, .picker-dialog-bg")).toBeNull();
});
it("closing the parent dialog disposes its picker", async () => {
  const props = { onOpenChange: vi.fn(), onSelect: vi.fn() };
  const { rerender } = render(<GoogleDrivePickerDialog open {...props} />);
  await browse();
  rerender(<GoogleDrivePickerDialog open={false} {...props} />);
  expect(document.querySelector(".picker-dialog, .picker-dialog-bg")).toBeNull();
});
it.each(["cancel", "unmount"])("%s while token loading cannot create a late orphan picker", async action => {
  let finish!: (value: { accessToken: string }) => void;
  vi.mocked(googleIntegrationService.getPickerToken).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { result, unmount } = renderHook(useGooglePicker);
  let pending!: ReturnType<typeof result.current.openGooglePicker>;
  act(() => { pending = result.current.openGooglePicker(); });
  await waitFor(() => expect(googleIntegrationService.getPickerToken).toHaveBeenCalled());
  act(() => { if (action === "cancel") result.current.dispose(); else unmount(); });
  await expect(pending).resolves.toBeNull();
  await act(async () => finish({ accessToken: "late-token" }));
  expect(instances).toHaveLength(0);
});
it("token errors return to a usable dialog without a Google overlay", async () => {
  vi.mocked(googleIntegrationService.getPickerToken).mockRejectedValue(new Error("Please reconnect Google Drive."));
  render(<GoogleDrivePickerDialog open onOpenChange={vi.fn()} onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Browse Google Drive" }));
  await screen.findByText("Please reconnect Google Drive.");
  expect(screen.getByRole("button", { name: "Browse Google Drive" })).toBeEnabled();
  expect(document.querySelector(".picker-dialog-bg")).toBeNull();
});
it("recent files still attach without opening Google Picker", async () => {
  const select = vi.fn();
  render(<GoogleDrivePickerDialog open onOpenChange={vi.fn()} onSelect={select} />);
  fireEvent.click(screen.getByText("Recent budget.xlsx"));
  fireEvent.click(screen.getByRole("button", { name: "Attach to task" }));
  await waitFor(() => expect(select).toHaveBeenCalledWith(expect.objectContaining({ fileId: "recent-1", webViewLink: recentFile.webViewLink, source: "google-drive" })));
  expect(googleIntegrationService.getPickerToken).not.toHaveBeenCalled();
});
it.each([{ docs: [] }, { docs: [{ id: "folder", mimeType: "application/vnd.google-apps.folder" }] }])("empty/folder selections cannot attach or leave picker DOM", async ({ docs }) => {
  const select = vi.fn();
  render(<GoogleDrivePickerDialog open onOpenChange={vi.fn()} onSelect={select} />);
  const picker = await browse();
  act(() => picker.callback({ action: "picked", docs }));
  await screen.findByRole("button", { name: "Browse Google Drive" });
  expect(select).not.toHaveBeenCalled();
  expect(document.querySelector(".picker-dialog, .picker-dialog-bg")).toBeNull();
});
