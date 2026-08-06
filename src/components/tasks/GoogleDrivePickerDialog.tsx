import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, FileIcon, Folder as FolderIcon, ChevronLeft, ChevronRight, Loader2,
  ExternalLink, Check, AlertTriangle, FolderUp, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { GoogleDriveFile } from "@/types/googleDrive";
import { useGoogleIntegration } from "@/hooks/useGoogleIntegration";
import { useGoogleDriveFiles } from "@/hooks/useGoogleDriveFiles";
import { getFileIcon } from "@/utils/fileIcons";
import { cn } from "@/lib/utils";

export interface GoogleDrivePickerDialogProps {
  open: boolean;
  taskId?: string | undefined;
  onOpenChange: (open: boolean) => void;
  onSelect: (attachment: {
    fileId: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    thumbnailLink?: string;
    source: "google-drive";
  }) => Promise<void> | void;
}

const isFolder = (f: GoogleDriveFile) =>
  f.mimeType === "application/vnd.google-apps.folder";

const GoogleDrivePickerDialog = ({ open, onOpenChange, onSelect }: GoogleDrivePickerDialogProps) => {
  const { isConnected, statusLoading, connect, connectLoading } = useGoogleIntegration();
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [folderStack, setFolderStack] = useState<Array<{ fileId: string; name: string }>>([]);
  const [selecting, setSelecting] = useState(false);
  const [attachPending, setAttachPending] = useState(false);

  const drive = useGoogleDriveFiles({
    enabled: open && isConnected,
  });

  // Clear only the selection when the dialog opens (i.e. new attach context).
  // Do NOT reset Drive files/folder state so files persist across task switches.
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setAttachPending(false);
    }
  }, [open]);

  const files = drive.files;
  const folders = useMemo(() => files.filter(isFolder), [files]);
  const nonFolders = useMemo(() => files.filter((f) => !isFolder(f)), [files]);
  const sorted = useMemo(() => [...folders, ...nonFolders], [folders, nonFolders]);

  const currentFolderName = folderStack.length
    ? folderStack[folderStack.length - 1]?.name
    : "My Drive";

  const handleOpenFolder = (folder: GoogleDriveFile) => {
    setFolderStack((s) => [...s, { fileId: folder.fileId, name: folder.name }]);
    drive.setFolderId(folder.fileId);
    setSelectedFile(null);
  };

  const handleBack = () => {
    if (!folderStack.length) {
      drive.setFolderId(undefined);
      setSelectedFile(null);
      return;
    }
    const next = folderStack.slice(0, -1);
    setFolderStack(next);
    const parent = next[next.length - 1];
    drive.setFolderId(parent?.fileId || undefined);
    setSelectedFile(null);
  };

  const handleConfirm = async () => {
    if (!selectedFile || isFolder(selectedFile) || attachPending) return;
    setSelecting(true);
    setAttachPending(true);
    try {
      await onSelect({
        fileId: selectedFile.fileId,
        name: selectedFile.name,
        mimeType: selectedFile.mimeType,
        webViewLink: selectedFile.webViewLink ?? undefined,
        thumbnailLink: selectedFile.thumbnailLink ?? selectedFile.iconLink ?? undefined,
        source: "google-drive",
      });
      setSelectedFile(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Could not attach file", { description: err?.message });
      setAttachPending(false);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !selecting && !drive.uploadLoading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4285F4]/10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#4285F4] fill-current">
                  <path d="M7.71 3.5h8.58l3.71 6.43H4L7.71 3.5zm-.71 1h7.5l2.78 4.81H4.22L7 4.5zM3.5 10l3.71 6.43L7.43 20.5h-.72L2.79 11.5l.71-1.5zM20.5 10l.71.5-3.92 9h-.72l-.21-4.07L20.5 10zm-16.79.5h13.29l-3.29 7.62h-6.72L3.71 10.5z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-lg">Choose from Google Drive</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {isConnected
                    ? "Select a file to attach it to the task."
                    : "Connect Google Drive to browse and attach files."}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Not connected state */}
        {statusLoading && !isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Checking Google Drive status…</p>
          </div>
        ) : !isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#4285F4]/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-[#4285F4]" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Google Drive is not connected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Connect your Google account to attach files directly from Google Drive to your tasks.
              </p>
            </div>
            <Button
              onClick={() => connect()}
              disabled={connectLoading}
              className="bg-[#4285F4] hover:bg-[#3b78e0] text-white shadow-sm h-10 px-6 gap-2"
            >
              {connectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Connect Google Drive
            </Button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-5 py-3 border-b shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleBack}
                  disabled={Boolean(drive.loading) || (folderStack.length === 0 && !drive.folderId)}
                >
                  <FolderUp className="w-4 h-4" />
                </Button>
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={drive.query}
                    onChange={(e) => drive.setQuery(e.target.value)}
                    placeholder="Search Drive…"
                    className="pl-9 h-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => drive.refresh()}
                  disabled={Boolean(drive.loading)}
                  title="Refresh"
                >
                  <RefreshCw className={cn("w-4 h-4", drive.loading && "animate-spin")} />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 opacity-50" />
                  <span className="inline-flex items-center gap-1 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="cursor-pointer h-5 px-1.5 text-[10px] font-medium"
                      onClick={() => { setFolderStack([]); drive.setFolderId(undefined); }}
                    >
                      My Drive
                    </Badge>
                    {folderStack.map((f, i) => (
                      <span key={f.fileId} className="inline-flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 opacity-40" />
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium",
                            i === folderStack.length - 1 ? "bg-primary/10 text-primary" : "cursor-pointer"
                          )}
                          onClick={() => {
                            const next = folderStack.slice(0, i + 1);
                            setFolderStack(next);
                            const parent = next[next.length - 1];
                            drive.setFolderId(parent?.fileId);
                          }}
                        >
                          {f.name}
                        </Badge>
                      </span>
                    ))}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {drive.loading && !drive.files.length
                    ? "Loading…"
                    : `${sorted.length} item${sorted.length === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {drive.loading && drive.files.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, k) => (
                    <div key={k} className="space-y-1.5">
                      <Skeleton className="h-20 w-full rounded-lg" />
                      <Skeleton className="h-3 w-3/4 rounded" />
                      <Skeleton className="h-2 w-1/2 rounded" />
                    </div>
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 gap-2 text-muted-foreground">
                  <FileIcon className="w-8 h-8 opacity-30" />
                  <p className="text-xs">
                    {drive.query
                      ? `No files match "${drive.query}"`
                      : `${currentFolderName} is empty`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {sorted.map((f) => {
                    const folder = isFolder(f);
                    const FileTypeIcon = getFileIcon(f.mimeType, f.name);
                    const selected = selectedFile?.fileId === f.fileId;
                    const showThumb = Boolean(f.thumbnailLink);
                    return (
                      <button
                        type="button"
                        key={f.fileId}
                        onClick={() => {
                          if (folder) return handleOpenFolder(f);
                          setSelectedFile((prev) => (prev?.fileId === f.fileId ? null : f));
                        }}
                        className={cn(
                          "group relative rounded-lg border p-2 text-left transition-all duration-150",
                          "hover:border-primary/40 hover:shadow-sm",
                          selected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="relative w-full h-20 rounded-md bg-muted/50 overflow-hidden flex items-center justify-center mb-2">
                          {showThumb ? (
                            <img
                              src={f.thumbnailLink!}
                              alt={f.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : folder ? (
                            <FolderIcon className="w-9 h-9 text-[#FBBC04]" />
                          ) : (
                            <FileTypeIcon className="w-8 h-8 text-primary/70" />
                          )}
                          {selected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            </div>
                          )}
                          {folder && (
                            <Badge className="absolute bottom-1 left-1 h-4 px-1 text-[9px] bg-muted text-foreground/70 border-none">
                              Folder
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium truncate" title={f.name}>{f.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">
                            {folder ? "Folder" : (f.mimeType || "").split("/").pop() || "file"}
                          </span>
                          {f.webViewLink && (
                            <a
                              href={f.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Load more */}
              {drive.hasMore && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => drive.loadMore()}
                    disabled={drive.loadingMore}
                    className="gap-2"
                  >
                    {drive.loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronLeft className="w-3.5 h-3.5 rotate-[-90deg]" />}
                    Load more
                  </Button>
                </div>
              )}

              {drive.error && (
                <div className="mt-4 text-center text-xs text-destructive">
                  Could not load Google Drive files. Please try again.
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={selecting || drive.uploadLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedFile || attachPending || selecting || !isConnected}
            className="gap-2"
          >
            {(selecting || attachPending) && <Loader2 className="w-4 h-4 animate-spin" />}
            Attach to task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleDrivePickerDialog;
