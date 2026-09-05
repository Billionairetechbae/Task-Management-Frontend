import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { readOfficePreview, type OfficePreview, type OfficePreviewKind } from "@/lib/officePreview";

export default function OfficeDocumentPreview({ blob, kind }: { blob: Blob; kind: OfficePreviewKind }) {
  const [state, setState] = useState<{ blob: Blob; kind: OfficePreviewKind; preview?: OfficePreview; error?: string } | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState(null);
    setSheetIndex(0);
    readOfficePreview(blob, kind).then(preview => {
      if (!cancelled) setState({ blob, kind, preview });
    }).catch(() => {
      if (!cancelled) setState({ blob, kind, error: blob.size > 10 * 1024 * 1024
        ? "This document is too large to preview. Download it to view the full file."
        : "Unable to preview this document. It may be corrupt, encrypted, or unsupported. You can still download the file." });
    });
    return () => { cancelled = true; };
  }, [blob, kind]);

  if (!state || state.blob !== blob || state.kind !== kind) return (
    <div role="status" className="flex items-center justify-center gap-2 p-8 w-full">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading preview...
    </div>
  );
  if (state.error) return <p role="alert" className="p-8 text-center text-muted-foreground">{state.error}</p>;
  const preview = state.preview;
  if (!preview) return null;
  if (preview.kind === "docx") return (
    <div className="w-full h-full overflow-auto p-4 sm:p-6">
      <p className="text-xs text-muted-foreground mb-3">Text and tables preview. Download for original formatting and images.</p>
      {preview.html ? <article aria-label="Document preview" className="prose prose-sm max-w-none bg-white text-black p-6 rounded [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2" dangerouslySetInnerHTML={{ __html: preview.html }} />
        : <p className="text-muted-foreground">No text or tables to preview. Download to view the full document.</p>}
    </div>
  );
  const sheet = preview.sheets[sheetIndex] || preview.sheets[0];
  const columns = Math.max(0, ...sheet.data.map(row => row.length));
  return (
    <div className="w-full h-full flex flex-col min-h-0 p-3 gap-3">
      <div className="flex gap-2 overflow-x-auto shrink-0" role="group" aria-label="Workbook sheets">
        {preview.sheets.map((entry, index) => (
          <button key={index} type="button" aria-pressed={sheetIndex === index} onClick={() => setSheetIndex(index)}
            className={`px-3 py-2 rounded border whitespace-nowrap text-sm ${sheetIndex === index ? "bg-primary text-primary-foreground" : "bg-background"}`}>
            {entry.sheet}
          </button>
        ))}
      </div>
      {sheet.truncated && <p className="text-xs text-muted-foreground">Preview limited to 500 rows and 50 columns. Download for the full sheet.</p>}
      <div className="overflow-auto flex-1 min-h-0">
        {sheet.data.length ? <table aria-label={sheet.sheet} className="text-sm border-collapse bg-background">
          <tbody>{sheet.data.map((row, rowIndex) => <tr key={rowIndex}>
            <th scope="row" className="border p-2 text-muted-foreground bg-muted sticky left-0">{rowIndex + 1}</th>
            {Array.from({ length: columns }, (_, column) => <td key={column} className="border p-2 min-w-24 max-w-sm whitespace-pre-wrap break-words align-top">{row[column] || ""}</td>)}
          </tr>)}</tbody>
        </table> : <p className="text-muted-foreground p-4">This sheet is empty.</p>}
      </div>
    </div>
  );
}
