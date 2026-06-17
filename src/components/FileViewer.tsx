import { useEffect, useState } from "react";
import { X, Download, ExternalLink, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFileIcon } from "@/utils/fileIcons";

export interface FileViewerFile {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
}

interface FileViewerProps {
  file: FileViewerFile | null;
  onClose: () => void;
}

type ViewerKind =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "text"
  | "office"
  | "unknown";

const officeExts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "ods", "odp", "rtf"];
const textExts = ["txt", "md", "csv", "json", "log", "xml", "yml", "yaml", "js", "ts", "tsx", "jsx", "css", "html"];

const detectKind = (mime: string, name: string): ViewerKind => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext)) return "image";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("video/") || ["mp4", "webm", "mov", "m4v", "ogv"].includes(ext)) return "video";
  if (m.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext)) return "audio";
  if (m.startsWith("text/") || textExts.includes(ext)) return "text";
  if (officeExts.includes(ext)) return "office";
  return "unknown";
};

const FileViewer = ({ file, onClose }: FileViewerProps) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const kind = detectKind(file.fileType, file.fileName);
    if (kind !== "text") {
      setTextContent(null);
      setTextError(null);
      return;
    }
    let cancelled = false;
    setLoadingText(true);
    setTextError(null);
    fetch(file.fileUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setTextContent(t.slice(0, 200_000));
      })
      .catch((e) => {
        if (!cancelled) setTextError(e.message || "Failed to load file");
      })
      .finally(() => {
        if (!cancelled) setLoadingText(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  if (!file) return null;
  const kind = detectKind(file.fileType, file.fileName);
  const Icon = getFileIcon(file.fileType, file.fileName);

  const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.fileUrl)}`;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-background w-full sm:rounded-2xl shadow-2xl sm:max-w-5xl sm:w-[95vw] h-full sm:h-[90vh] flex flex-col overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-border bg-card">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-sm sm:text-base">{file.fileName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {file.fileType || "file"}
              {file.fileSize ? ` • ${(file.fileSize / 1024).toFixed(1)} KB` : ""}
            </p>
          </div>
          <Button asChild variant="ghost" size="icon" title="Open in new tab">
            <a href={file.fileUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="icon" title="Download">
            <a href={file.fileUrl} download={file.fileName}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center">
          {kind === "image" && (
            <img
              src={file.fileUrl}
              alt={file.fileName}
              className="max-h-full max-w-full object-contain p-2 sm:p-4"
            />
          )}

          {kind === "pdf" && (
            <iframe
              src={file.fileUrl}
              title={file.fileName}
              className="w-full h-full border-0 bg-white"
            />
          )}

          {kind === "video" && (
            <video src={file.fileUrl} controls className="max-h-full max-w-full bg-black">
              Your browser does not support video.
            </video>
          )}

          {kind === "audio" && (
            <div className="w-full max-w-lg p-6">
              <audio src={file.fileUrl} controls className="w-full" />
            </div>
          )}

          {kind === "office" && (
            <iframe
              src={officeUrl}
              title={file.fileName}
              className="w-full h-full border-0 bg-white"
            />
          )}

          {kind === "text" && (
            <div className="w-full h-full p-3 sm:p-4 overflow-auto">
              {loadingText && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              {textError && (
                <div className="text-destructive text-sm">Failed to load: {textError}</div>
              )}
              {!loadingText && !textError && textContent !== null && (
                <pre className="text-xs sm:text-sm bg-card border border-border rounded-lg p-4 whitespace-pre-wrap break-words font-mono">
                  {textContent}
                </pre>
              )}
            </div>
          )}

          {kind === "unknown" && (
            <div className="text-center p-8 max-w-md">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold mb-1">Preview not available</p>
              <p className="text-sm text-muted-foreground mb-4">
                This file type can't be previewed in the browser.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild>
                  <a href={file.fileUrl} download={file.fileName}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={file.fileUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Open
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
