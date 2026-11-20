import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getFileIcon } from "@/utils/fileIcons";

const SAFE_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;

function isSafeImage(type: string, name: string) {
  return /^(image\/(png|jpeg|webp|gif))$/i.test(type) || SAFE_IMAGE_EXTENSIONS.test(name);
}

function useLocalImageUrl(file: File) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isSafeImage(file.type, file.name)) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}

export function PendingTaskCommentAttachment({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const url = useLocalImageUrl(file);
  const Icon = getFileIcon(file.type, file.name);

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background p-2" data-testid="pending-comment-attachment">
      {url ? (
        <img src={url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <Icon className="h-8 w-8 shrink-0 text-primary/70" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate text-xs" title={file.name}>{file.name}</span>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Remove ${file.name}`} onClick={onRemove}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function TaskCommentAttachment({
  taskId,
  attachment,
  onPreview,
  onDownload,
}: {
  taskId: string;
  attachment: { id: string; fileName: string; fileType?: string | null; mimeType?: string | null; fileSize?: number | null };
  onPreview: () => void;
  onDownload: () => void;
}) {
  const type = attachment.fileType || attachment.mimeType || "";
  const image = isSafeImage(type, attachment.fileName);
  const Icon = getFileIcon(type, attachment.fileName);
  const [thumbnail, setThumbnail] = useState<{ url: string; loading: false; error: false } | { url: null; loading: true; error: false } | { url: null; loading: false; error: true }>({
    url: null,
    loading: image,
    error: false,
  });
  const requestId = useRef(0);
  const currentUrl = useRef<string | null>(null);

  const loadThumbnail = useCallback(async () => {
    if (!image) return;
    const request = ++requestId.current;
    setThumbnail({ url: null, loading: true, error: false });
    try {
      const { blob } = await api.previewTaskAttachment(taskId, attachment.id);
      const url = URL.createObjectURL(blob);
      if (request !== requestId.current) {
        URL.revokeObjectURL(url);
        return;
      }
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = url;
      setThumbnail({ url, loading: false, error: false });
    } catch {
      if (request === requestId.current) setThumbnail({ url: null, loading: false, error: true });
    }
  }, [attachment.id, image, taskId]);

  useEffect(() => {
    void loadThumbnail();
    return () => {
      requestId.current += 1;
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = null;
    };
  }, [loadThumbnail]);

  const sizeLabel = attachment.fileSize
    ? `${(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`
    : null;

  return (
    <div className="w-full max-w-[15rem] overflow-hidden rounded-lg border bg-background">
      <button
        type="button"
        className="block aspect-[16/10] w-full bg-muted/40 p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Preview ${attachment.fileName}`}
        onClick={onPreview}
      >
        {image && thumbnail.url ? (
          <img src={thumbnail.url} alt={attachment.fileName} className="h-full w-full object-contain" />
        ) : image && thumbnail.loading ? (
          <span className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preview
          </span>
        ) : image && thumbnail.error ? (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-7 w-7" aria-hidden />
            Preview unavailable
          </span>
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Icon className="h-9 w-9 text-primary/70" aria-hidden />
            <span className="text-[10px] uppercase">{type.split("/").pop() || "file"}</span>
          </span>
        )}
      </button>
      <div className="flex min-w-0 items-center gap-2 border-t p-2">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={attachment.fileName}>{attachment.fileName}</p>
          {sizeLabel && <p className="text-[10px] text-muted-foreground">{sizeLabel}</p>}
        </div>
        {image && thumbnail.error && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Retry preview for ${attachment.fileName}`} onClick={() => void loadThumbnail()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Download ${attachment.fileName}`} onClick={onDownload}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
