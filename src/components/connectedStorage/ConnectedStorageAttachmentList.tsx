import { useState } from "react";
import { Cloud, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, type ConnectedStorageAttachment } from "@/lib/api";

// Renders normalized Connected Storage attachments (source: Dropbox). It never sees or shows a provider URL: "Open" asks the Admiino
// backend for a fresh short-lived link at click time and sends the browser there. Unlinking removes the Admiino reference only.

const PROVIDER_LABEL: Record<string, string> = { dropbox: "Dropbox", google_drive: "Google Drive", onedrive: "OneDrive", box: "Box" };

export function attachmentStateLabel(attachment: ConnectedStorageAttachment): string | null {
  if (attachment.connectionStatus === "disconnected") return `${PROVIDER_LABEL[attachment.provider] ?? "Storage"} disconnected`;
  if (attachment.connectionStatus === "reauth_required" || attachment.connectionStatus === "error") return `${PROVIDER_LABEL[attachment.provider] ?? "Storage"} needs reconnection`;
  if (attachment.availability === "deleted" || attachment.availability === "unavailable") return `File unavailable in ${PROVIDER_LABEL[attachment.provider] ?? "storage"}`;
  return null;
}

const formatSize = (bytes: number | null) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};

const OPEN_ERRORS: Record<string, string> = {
  file_unavailable: "This file is no longer available in Dropbox.",
  disconnected: "Dropbox is disconnected for this workspace.",
  reauth_required: "Dropbox needs to be reconnected by a workspace owner or admin.",
  rate_limited: "Dropbox is limiting requests right now. Please try again shortly.",
  provider_unavailable: "Dropbox is temporarily unavailable. Please try again shortly.",
  no_link: "Dropbox will not provide a link for this file.",
};

export function useOpenConnectedStorageAttachment(onStale?: () => void) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const open = async (attachment: ConnectedStorageAttachment) => {
    setOpeningId(attachment.id);
    // Open the tab synchronously (inside the click) so pop-up blockers allow it, then point it at the fresh link.
    const popup = typeof window !== "undefined" ? window.open("", "_blank") : null;
    try {
      const res = await api.openConnectedStorageAttachment(attachment.id);
      const url = res.data.url;
      if (typeof url !== "string" || !/^https:\/\//i.test(url)) throw new Error("Unusable link");
      if (popup) { try { popup.opener = null; } catch { /* cross-origin guard */ } popup.location.href = url; }
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      popup?.close();
      const code: string | undefined = err?.body?.code;
      toast.error("Could not open file", { description: (code && OPEN_ERRORS[code]) || "Something went wrong. Please try again." });
      onStale?.(); // availability / connection state may have changed: refresh the list
    } finally {
      setOpeningId(null);
    }
  };
  return { open, openingId };
}

export interface ConnectedStorageAttachmentListProps {
  attachments: ConnectedStorageAttachment[];
  /** Called after an unlink or a failed open so the owner can refresh. */
  onChanged?: () => void;
  compact?: boolean;
}

export function ConnectedStorageAttachmentList({ attachments, onChanged, compact = false }: ConnectedStorageAttachmentListProps) {
  const { open, openingId } = useOpenConnectedStorageAttachment(onChanged);
  const [unlinkTarget, setUnlinkTarget] = useState<ConnectedStorageAttachment | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  if (!attachments?.length) return null;

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      const res = await api.unlinkConnectedStorageAttachment(unlinkTarget.id);
      toast.success(res.message || "Removed from Admiino. The file in Dropbox was not changed.");
      setUnlinkTarget(null);
      onChanged?.();
    } catch (err: any) {
      toast.error("Could not remove the file", { description: err?.message || "Please try again." });
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <>
      <ul className={compact ? "space-y-1" : "space-y-2"} aria-label="Dropbox files" data-testid="connected-storage-attachments">
        {attachments.map((attachment) => {
          const stateLabel = attachmentStateLabel(attachment);
          return (
            <li key={attachment.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm" data-testid="connected-storage-attachment">
              <Cloud className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium" title={attachment.name}>{attachment.name}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">{PROVIDER_LABEL[attachment.provider] ?? attachment.provider}</Badge>
                  {attachment.mimeType && <span>{attachment.mimeType}</span>}
                  {attachment.size != null && <span>{formatSize(attachment.size)}</span>}
                  {!compact && attachment.createdAt && <span>Attached {new Date(attachment.createdAt).toLocaleDateString()}</span>}
                  {stateLabel && <span className="text-destructive" role="status">{stateLabel}</span>}
                </div>
              </div>
              <Button
                size="sm" variant="outline" className="h-7 gap-1 text-xs"
                disabled={!attachment.canOpen || openingId === attachment.id}
                onClick={() => void open(attachment)}
                aria-label={`Open ${attachment.name}`}
              >
                {openingId === attachment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}Open
              </Button>
              {attachment.canUnlink && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setUnlinkTarget(attachment)} aria-label={`Remove ${attachment.name} from Admiino`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <AlertDialog open={!!unlinkTarget} onOpenChange={(openState) => { if (!openState && !unlinking) setUnlinkTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Admiino?</AlertDialogTitle>
            <AlertDialogDescription>
              “{unlinkTarget?.name}” will no longer be linked here. The file stays in Dropbox and is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmUnlink(); }} disabled={unlinking}>
              {unlinking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ConnectedStorageAttachmentList;
