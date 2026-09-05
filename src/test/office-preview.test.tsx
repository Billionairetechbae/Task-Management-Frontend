// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { api } from "@/lib/api";
import { getOfficePreviewKind, readOfficePreview } from "@/lib/officePreview";
import OfficeDocumentPreview from "@/components/OfficeDocumentPreview";
import AttachmentPreview from "@/components/AttachmentPreview";
import FileViewer from "@/components/FileViewer";

// jsdom's Blob lacks arrayBuffer(); FileReader keeps the result in the browser realm.
beforeAll(() => {
  Object.defineProperty(Blob.prototype, "arrayBuffer", { configurable: true, value: function () {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  } });
});

const fixture = (kind: "docx" | "xlsx") => new Blob([new Uint8Array(readFileSync(`src/test/fixtures/preview.${kind}`))]);
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

for (const [flow, download] of [
  ["Task", () => api.downloadTaskAttachment("t", "a")],
  ["Drive", () => api.downloadDriveFile("f")],
  ["Assistance", () => api.downloadAssistanceAttachment("r", 0)],
] as const) describe(`${flow} confidential Office preview`, () => {
  it.each(["docx", "xlsx"] as const)("renders a real .%s from the authenticated Blob response", async kind => {
    const response = new Response(null);
    vi.spyOn(response, "blob").mockResolvedValue(fixture(kind));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    const { blob } = await download();
    const name = `Budget Model.${kind}`;
    const props = { blob, fileName: name, fileUrl: "blob:authenticated", fileType: "application/octet-stream" };
    const view = flow === "Drive" ? render(<FileViewer file={props} onClose={() => {}} />)
      : render(<AttachmentPreview blob={blob} url={props.fileUrl} name={name} type={props.fileType} onClose={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading preview...");
    expect(await screen.findByText("Budget total")).toBeTruthy();
    expect(view.container.querySelector('a[download]')).toHaveAttribute("download", name);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only the authenticated API request, never a viewer request.
    expect(view.container.querySelector("iframe, script, article a, article img")).toBeNull();
    if (kind === "docx") expect(screen.getByText("Confidential budget 日本語")).toBeTruthy();
  });
});
it("switches between workbook sheets, retains zero values, and handles empty sheets", async () => {
  render(<OfficeDocumentPreview blob={fixture("xlsx")} kind="xlsx" />);
  expect(await screen.findByRole("table", { name: "Budget" })).toBeTruthy();
  expect(screen.getByText("0")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Forecast" }));
  expect(screen.getByRole("table", { name: "Forecast" })).toHaveTextContent("2400");
  expect(screen.getByRole("button", { name: "Forecast" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Empty" }));
  expect(screen.getByText("This sheet is empty.")).toBeTruthy();
});
it.each(["docx", "xlsx"] as const)("malformed %s fails safely and keeps Download available", async kind => {
  const name = `Broken.${kind}`;
  const { container } = render(<AttachmentPreview blob={new Blob(["not a zip file"])} url="blob:broken" name={name} type="" onClose={() => {}} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("corrupt, encrypted, or unsupported");
  expect(container.querySelector('a[download]')).toHaveAttribute("download", name);
});
it("rejects oversized documents before reading their bytes", async () => {
  const blob = new Blob([new Uint8Array(10 * 1024 * 1024 + 1)]);
  const read = vi.spyOn(blob, "arrayBuffer");
  await expect(readOfficePreview(blob, "docx")).rejects.toThrow("too large");
  expect(read).not.toHaveBeenCalled();
});
it("treats embedded HTML and hyperlinks as inert content", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network"));
  const { container } = render(<OfficeDocumentPreview blob={fixture("docx")} kind="docx" />);
  await screen.findByText("Unsafe link");
  expect(container.querySelector("a, img, script, style, iframe")).toBeNull();
  expect(container.textContent).toContain('<img src="https://example.invalid/leak"');
  expect(fetchSpy).not.toHaveBeenCalled();
});
it("renders spreadsheet strings as text, never HTML or executable formulas", async () => {
  const { container } = render(<OfficeDocumentPreview blob={fixture("xlsx")} kind="xlsx" />);
  await screen.findByText("Budget total");
  expect(container.querySelector("img, a, script, iframe")).toBeNull();
  expect(container.textContent).toContain('<img src="https://example.invalid/leak"');
});
it("ignores stale parser completion after replacing the document", async () => {
  let resolve!: (buffer: ArrayBuffer) => void;
  const oldBlob = fixture("docx");
  vi.spyOn(oldBlob, "arrayBuffer").mockReturnValue(new Promise(r => { resolve = r; }));
  const { rerender } = render(<OfficeDocumentPreview blob={oldBlob} kind="docx" />);
  rerender(<OfficeDocumentPreview blob={fixture("xlsx")} kind="xlsx" />);
  await screen.findByRole("table", { name: "Budget" });
  await act(async () => { resolve(await fixture("docx").arrayBuffer()); });
  expect(screen.queryByLabelText("Document preview")).toBeNull();
  expect(screen.getByRole("table", { name: "Budget" })).toBeTruthy();
});
it("unmounts safely while parsing is pending", async () => {
  let resolve!: (buffer: ArrayBuffer) => void;
  const blob = fixture("docx");
  vi.spyOn(blob, "arrayBuffer").mockReturnValue(new Promise(r => { resolve = r; }));
  const { unmount, container } = render(<OfficeDocumentPreview blob={blob} kind="docx" />);
  unmount();
  await act(async () => { resolve(await fixture("docx").arrayBuffer()); });
  expect(container).toBeEmptyDOMElement();
});
it("does not claim support for PPTX or legacy Office formats", () => {
  expect(getOfficePreviewKind("slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBeNull();
  expect(getOfficePreviewKind("old.doc", "application/msword")).toBeNull();
  expect(getOfficePreviewKind("old.xls", "application/vnd.ms-excel")).toBeNull();
});
it("detects supported Office MIME types without an extension", () => {
  expect(getOfficePreviewKind("document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("docx");
  expect(getOfficePreviewKind("workbook", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("xlsx");
});
it("has no external viewer or storage metadata dependency in the Office parser", () => {
  for (const path of ["src/components/OfficeDocumentPreview.tsx", "src/lib/officePreview.ts"]) {
    expect(readFileSync(path, "utf8")).not.toMatch(/fileUrl|publicId|secure_url|cloudinary|fetch\(|XMLHttpRequest/);
  }
  for (const path of ["src/components/AttachmentPreview.tsx", "src/components/FileViewer.tsx"]) {
    expect(readFileSync(path, "utf8")).not.toMatch(/officeapps|docs\.google|cloudinary/);
  }
});
it.each(["docx", "xlsx"] as const)("parses %s bytes with the real browser library", async kind => {
  expect((await readOfficePreview(fixture(kind), kind)).kind).toBe(kind);
});
it("fails closed if the browser cannot sanitize DOCX HTML", async () => {
  const { default: purifier } = await import("dompurify");
  const supported = purifier.isSupported;
  purifier.isSupported = false;
  try {
    await expect(readOfficePreview(fixture("docx"), "docx")).rejects.toThrow("Safe document preview is unavailable");
  } finally { purifier.isSupported = supported; }
});
it("limits large sheets without modifying the original Blob", async () => {
  const blob = fixture("xlsx");
  const originalSize = blob.size;
  const preview = await readOfficePreview(blob, "xlsx");
  if (preview.kind !== "xlsx") throw new Error("Expected workbook");
  const large = preview.sheets.find(sheet => sheet.sheet === "Large")!;
  expect(large.truncated).toBe(true);
  expect(large.data).toHaveLength(500);
  expect(large.data[0]).toHaveLength(50);
  expect(blob.size).toBe(originalSize);
});

vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ activeCompanyId: "company", workspaceRole: "member", user: { role: "team_member" } }) }));
vi.mock("@/components/AssistanceRequestDialog", () => ({ default: () => null }));

it("Assistance Preview button fetches bytes, opens the document, and revokes its URL on close", async () => {
  const { default: Requests } = await import("@/pages/ExecutiveAssistanceRequests");
  vi.spyOn(api, "getWorkspaceSettings").mockResolvedValue({ data: { settings: { assistancePermissionMode: "restricted" } } } as never);
  vi.spyOn(api, "getMyAssistanceRequests").mockResolvedValue({ data: { requests: [{
    id: "request-1", title: "Budget review", description: "Review the budget", status: "pending", priority: "medium", category: "other", createdAt: "2026-01-01", attachments: [{ fileName: "Budget.docx", fileType: "application/octet-stream", fileSize: 123 }],
  }] } } as never);
  const download = vi.spyOn(api, "downloadAssistanceAttachment").mockResolvedValue({ blob: fixture("docx"), fileName: "", contentType: "application/octet-stream" });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:assistance-preview") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  render(<Requests />);
  fireEvent.click(await screen.findByRole("button", { name: "View" }));
  fireEvent.click(await screen.findByRole("button", { name: "Preview" }));
  expect(await screen.findByText("Confidential budget 日本語")).toBeTruthy();
  expect(download).toHaveBeenCalledWith("request-1", 0);
  expect(document.querySelector('a[download="Budget.docx"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:assistance-preview");
  expect(await screen.findByRole("button", { name: "Preview" })).toBeTruthy();
});
it.each(["Task", "Drive"])("%s keeps PPTX fallback with a confidential Blob", viewer => {
  const blob = new Blob(["presentation bytes"]);
  const props = { blob, fileUrl: "blob:pptx", fileName: "Slides.pptx", fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
  const { container } = viewer === "Drive" ? render(<FileViewer file={props} onClose={() => {}} />)
    : render(<AttachmentPreview blob={blob} url={props.fileUrl} name={props.fileName} type={props.fileType} onClose={() => {}} />);
  expect(screen.getByText("Preview not available for this file type.")).toBeTruthy();
  expect(container.querySelector("iframe")).toBeNull();
  expect(container.querySelector('a[download]')).toHaveAttribute("download", "Slides.pptx");
});
