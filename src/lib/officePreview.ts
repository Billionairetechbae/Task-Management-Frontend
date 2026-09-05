export type OfficePreviewKind = "docx" | "xlsx";
export type WorkbookSheet = { sheet: string; data: string[][]; truncated: boolean };
export type OfficePreview = { kind: "docx"; html: string } | { kind: "xlsx"; sheets: WorkbookSheet[] };

export function getOfficePreviewKind(name: string, mime: string): OfficePreviewKind | null {
  if (/\.docx$/i.test(name) || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (/\.xlsx$/i.test(name) || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  return null;
}

/** Accept file bytes only. Document URLs and storage identifiers are never inputs. */
export async function readOfficePreview(blob: Blob, kind: OfficePreviewKind): Promise<OfficePreview> {
  if (blob.size > 10 * 1024 * 1024) throw new Error("This document is too large to preview. Download it to view the full file.");
  const arrayBuffer = await blob.arrayBuffer();
  if (kind === "docx") {
    const [{ default: mammoth }, { default: DOMPurify }] = await Promise.all([
      import("mammoth/mammoth.browser"), import("dompurify"),
    ]);
    if (!DOMPurify.isSupported) throw new Error("Safe document preview is unavailable in this browser");
    const result = await mammoth.convertToHtml({ arrayBuffer }, {
      externalFileAccess: false,
      includeEmbeddedStyleMap: false,
      // Text/table preview: do not resolve image relationships or external resources.
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    });
    const html = DOMPurify.sanitize(result.value, {
      ALLOWED_TAGS: ["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "u", "s", "sub", "sup", "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tr", "th", "td"],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });
    return { kind, html };
  }
  const { default: readExcelFile } = await import("read-excel-file/universal");
  const workbook = await readExcelFile(arrayBuffer);
  if (!workbook.length) throw new Error("No sheets found");
  return {
    kind,
    sheets: workbook.map(({ sheet, data }) => ({
      sheet,
      truncated: data.length > 500 || data.some(row => row.length > 50),
      data: data.slice(0, 500).map(row => row.slice(0, 50).map(value =>
        value == null ? "" : value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
      )),
    })),
  };
}
