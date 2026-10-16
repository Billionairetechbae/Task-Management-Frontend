import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AttachmentPreview from "@/components/AttachmentPreview";
import { usePreviewBlobUrl } from "@/hooks/usePreviewBlobUrl";
import { api, type ConnectedStorageAttachment } from "@/lib/api";

// In-app preview of a Dropbox attachment. The bytes come from Admiino's authenticated preview endpoint (the server fetches the file, verifies its
// type and streams it); the browser never receives a Dropbox link for previews, and nothing opens in a new tab. Rendering reuses AttachmentPreview.
type PreviewState =
  | { kind: "loading" }
  | { kind: "ready"; blob: Blob; url: string; type: string }
  | { kind: "error"; code: string };

const MESSAGES: Record<string, { title: string; body: string; canOpen: boolean }> = {
  preview_not_supported: { title: "Preview not available", body: "This file can't be previewed in Admiino. Use Open to view it in Dropbox.", canOpen: true },
  file_unavailable: { title: "File unavailable in Dropbox", body: "This file was deleted or is no longer accessible in Dropbox.", canOpen: false },
  reauth_required: { title: "Dropbox needs reconnection", body: "A workspace owner or admin needs to reconnect Dropbox before this file can be shown.", canOpen: false },
  disconnected: { title: "Dropbox disconnected", body: "Dropbox is disconnected for this workspace, so this file can't be shown.", canOpen: false },
  rate_limited: { title: "Dropbox is busy", body: "Dropbox is limiting requests right now. Please try again shortly.", canOpen: false },
  provider_unavailable: { title: "Dropbox unavailable", body: "Dropbox is temporarily unavailable. Please try again shortly.", canOpen: false },
  forbidden: { title: "No access", body: "You don't have access to this file.", canOpen: false },
  generic: { title: "Preview failed", body: "Something went wrong while loading the preview. Please try again, or use Open.", canOpen: true },
};

export interface ConnectedStoragePreviewDialogProps {
  attachment: ConnectedStorageAttachment;
  onClose: () => void;
  /** Fallback for files that can't be previewed: the existing authenticated Open flow. */
  onOpen: (attachment: ConnectedStorageAttachment) => void;
}

export function ConnectedStoragePreviewDialog({ attachment, onClose, onOpen }: ConnectedStoragePreviewDialogProps) {
  const [state, setState] = useState<PreviewState>({ kind: "loading" });
  const blobUrls = usePreviewBlobUrl(); // owns (and revokes) the object URL

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api.previewConnectedStorageAttachment(attachment.id)
      .then(({ blob, contentType }) => {
        if (cancelled) return;
        const type = (blob.type || contentType || "").split(";")[0].trim();
        setState({ kind: "ready", blob, url: blobUrls.create(blob), type });
      })
      .catch((err: any) => {
        if (cancelled) return;
        const code: string | undefined = err?.body?.code;
        const status: number | undefined = err?.statusCode ?? err?.status;
        setState({ kind: "error", code: code && MESSAGES[code] ? code : status === 403 ? "forbidden" : status === 429 ? "rate_limited" : "generic" });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id]);

  if (state.kind === "ready") {
    return <AttachmentPreview url={state.url} blob={state.blob} type={state.type} name={attachment.name} onClose={onClose} />;
  }

  const message = state.kind === "error" ? MESSAGES[state.code] : null;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md" data-testid="connected-storage-preview-dialog">
        <DialogHeader>
          <DialogTitle className="truncate">{attachment.name}</DialogTitle>
          <DialogDescription>{state.kind === "loading" ? "Loading preview…" : message?.title}</DialogDescription>
        </DialogHeader>
        {state.kind === "loading" ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground" role="status"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading preview…</div>
        ) : (
          <div className="py-4 text-center space-y-2" role="alert" data-testid={`preview-error-${state.kind === "error" ? state.code : ""}`}>
            <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="font-medium text-sm">{message?.title}</p>
            <p className="text-sm text-muted-foreground">{message?.body}</p>
          </div>
        )}
        <DialogFooter>
          {message?.canOpen && attachment.canOpen && (
            <Button variant="outline" onClick={() => { onOpen(attachment); onClose(); }}><ExternalLink className="w-4 h-4 mr-2" />Open</Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConnectedStoragePreviewDialog;
