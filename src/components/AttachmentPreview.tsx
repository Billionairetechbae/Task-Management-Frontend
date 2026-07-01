import { X, Download, ExternalLink, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFileIcon } from "@/utils/fileIcons";

interface AttachmentPreviewProps {
  url: string;
  type: string;
  name: string;
  onClose: () => void;
  /** Optional: show "Add to Task Documents" action. */
  onAddToTaskDocs?: () => void;
  /** When true, marks the file as already in task documents. */
  alreadyInTaskDocs?: boolean;
  addingToTaskDocs?: boolean;
}

const isOffice = (type: string, name: string) => {
  const t = (type || "").toLowerCase();
  const n = (name || "").toLowerCase();
  return (
    t.includes("word") ||
    t.includes("excel") ||
    t.includes("spreadsheet") ||
    t.includes("presentation") ||
    t.includes("powerpoint") ||
    /\.(docx?|xlsx?|pptx?)$/i.test(n)
  );
};

const AttachmentPreview = ({
  url,
  type,
  name,
  onClose,
  onAddToTaskDocs,
  alreadyInTaskDocs,
  addingToTaskDocs,
}: AttachmentPreviewProps) => {
  const t = (type || "").toLowerCase();
  const isImage = t.startsWith("image") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
  const isPDF = t === "application/pdf" || /\.pdf$/i.test(name);
  const isVideo = t.startsWith("video") || /\.(mp4|webm|mov|m4v)$/i.test(name);
  const isAudio = t.startsWith("audio") || /\.(mp3|wav|ogg|m4a)$/i.test(name);
  const isText = t.startsWith("text") || /\.(txt|md|csv|log|json)$/i.test(name);
  const isOfficeFile = isOffice(type, name);

  const Icon = getFileIcon(type, name);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-background border rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm sm:text-base truncate">{name}</h2>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                {type || "file"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onAddToTaskDocs && (
              <Button
                size="sm"
                variant={alreadyInTaskDocs ? "outline" : "default"}
                onClick={onAddToTaskDocs}
                disabled={alreadyInTaskDocs || addingToTaskDocs}
                className="hidden sm:inline-flex gap-1.5 text-xs"
              >
                {alreadyInTaskDocs ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    In Task Documents
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    {addingToTaskDocs ? "Adding…" : "Add to Task Documents"}
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
              <a href={url} download={name}>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile-only add button */}
        {onAddToTaskDocs && (
          <div className="sm:hidden px-3 py-2 border-b bg-muted/30">
            <Button
              size="sm"
              variant={alreadyInTaskDocs ? "outline" : "default"}
              onClick={onAddToTaskDocs}
              disabled={alreadyInTaskDocs || addingToTaskDocs}
              className="w-full gap-1.5 text-xs"
            >
              {alreadyInTaskDocs ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  In Task Documents
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  {addingToTaskDocs ? "Adding…" : "Add to Task Documents"}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto bg-muted/20 flex items-center justify-center">
          {isImage && (
            <img src={url} alt={name} className="max-h-full max-w-full object-contain" />
          )}
          {isPDF && (
            <iframe src={url} title={name} className="w-full h-full min-h-[70vh] border-0" />
          )}
          {isVideo && (
            <video src={url} controls className="max-h-full max-w-full">
              Your browser does not support the video tag.
            </video>
          )}
          {isAudio && (
            <div className="p-6 w-full max-w-lg">
              <audio src={url} controls className="w-full" />
            </div>
          )}
          {isOfficeFile && !isPDF && (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              title={name}
              className="w-full h-full min-h-[70vh] border-0 bg-white"
            />
          )}
          {isText && !isPDF && !isOfficeFile && (
            <iframe src={url} title={name} className="w-full h-full min-h-[60vh] border-0 bg-white" />
          )}
          {!isImage && !isPDF && !isVideo && !isAudio && !isOfficeFile && !isText && (
            <div className="p-8 text-center text-muted-foreground">
              <Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Preview not available for this file type.</p>
              <p className="text-xs mt-1">Use Open or Download to view the file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentPreview;
