import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Eye, FileText, Folder, FolderPlus, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { api, triggerBlobDownload, type Folder as ProjectFolder, type FolderFile, type ProjectFileListing } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FileViewer, { type FileViewerFile } from "@/components/FileViewer";
import { formatTaskDeadline } from "@/components/dashboard/TaskComponents";

type EditTarget =
  | { type: "folder"; action: "rename" | "move"; id: string; name: string; folderId: string }
  | { type: "file"; action: "rename" | "move"; id: string; name: string; folderId: string };

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

export default function ProjectFilesManager({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [listing, setListing] = useState<ProjectFileListing | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editFolderId, setEditFolderId] = useState("");
  const [preview, setPreview] = useState<FileViewerFile | null>(null);

  const loadFiles = useCallback(async (requestedFolderId?: string) => {
    setLoading(true);
    try {
      const response = await api.listProjectFiles(projectId, requestedFolderId);
      setListing(response.data);
      if (!requestedFolderId) setFolderId(response.data.folder.id);
    } catch (error: unknown) {
      toast({ title: "Could not load project files", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    setFolderId(null);
    setListing(null);
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (folderId && listing?.folder.id !== folderId) void loadFiles(folderId);
  }, [folderId, listing?.folder.id, loadFiles]);

  useEffect(() => () => {
    if (preview?.fileUrl.startsWith("blob:")) URL.revokeObjectURL(preview.fileUrl);
  }, [preview]);

  const folderById = useMemo(() => new Map((listing?.folderOptions || []).map((folder) => [folder.id, folder])), [listing?.folderOptions]);
  const moveableFolders = useCallback((target: EditTarget) => {
    const rootId = listing?.rootFolder.id;
    return (listing?.folderOptions || []).filter((candidate) => {
      if (target.type === "file") return candidate.id !== target.folderId;
      if (candidate.id === target.id) return false;
      let parentId = candidate.parentId;
      while (parentId) {
        if (parentId === target.id) return false;
        parentId = folderById.get(parentId)?.parentId || null;
      }
      return candidate.id === rootId || Boolean(candidate.parentId);
    });
  }, [folderById, listing?.folderOptions, listing?.rootFolder.id]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !folderId) return;
    setBusy(true);
    try {
      await api.createProjectFolder(projectId, { name, parentId: folderId });
      setNewFolderName("");
      setNewFolderOpen(false);
      await loadFiles(folderId);
      toast({ title: "Folder created" });
    } catch (error: unknown) {
      toast({ title: "Could not create folder", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || !folderId) return;
    setBusy(true);
    try {
      await api.uploadProjectFiles(projectId, folderId, Array.from(files));
      await loadFiles(folderId);
      toast({ title: "Files uploaded", description: `${files.length} file${files.length === 1 ? "" : "s"} added to this project.` });
    } catch (error: unknown) {
      toast({ title: "Upload failed", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openEdit = (target: EditTarget) => {
    setEditTarget(target);
    setEditValue(target.name);
    const destinations = target.action === "move" ? moveableFolders(target) : [];
    setEditFolderId(target.action === "move"
      ? destinations.find((folder) => folder.id !== target.folderId)?.id || ""
      : target.folderId);
  };

  const saveEdit = async () => {
    if (!editTarget || !folderId) return;
    setBusy(true);
    try {
      if (editTarget.type === "folder") {
        await api.updateProjectFolder(projectId, editTarget.id, editTarget.action === "rename"
          ? { name: editValue.trim() }
          : { parentId: editFolderId });
      } else {
        await api.updateProjectFile(projectId, editTarget.id, editTarget.action === "rename"
          ? { fileName: editValue.trim() }
          : { folderId: editFolderId });
      }
      setEditTarget(null);
      await loadFiles(folderId);
      toast({ title: editTarget.action === "rename" ? "Name updated" : "Item moved" });
    } catch (error: unknown) {
      toast({ title: "Could not update item", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeFile = async (file: FolderFile) => {
    if (!folderId || !window.confirm(`Move "${file.fileName}" to Trash?`)) return;
    setBusy(true);
    try {
      await api.deleteProjectFile(projectId, file.id);
      await loadFiles(folderId);
      toast({ title: "File moved to Trash" });
    } catch (error: unknown) {
      toast({ title: "Could not delete file", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeFolder = async (folder: ProjectFolder) => {
    if (!folderId || !window.confirm(`Move "${folder.name}" and its contents to Trash?`)) return;
    setBusy(true);
    try {
      await api.deleteProjectFolder(projectId, folder.id);
      await loadFiles(folderId);
      toast({ title: "Folder moved to Trash" });
    } catch (error: unknown) {
      toast({ title: "Could not delete folder", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const downloadFile = async (file: FolderFile) => {
    try {
      const result = await api.downloadDriveFile(file.id);
      triggerBlobDownload(result.blob, result.fileName || file.fileName);
    } catch (error: unknown) {
      toast({ title: "Download failed", description: getErrorMessage(error, "You may no longer have access to this file."), variant: "destructive" });
    }
  };

  const previewFile = async (file: FolderFile) => {
    try {
      const result = await api.downloadDriveFile(file.id);
      setPreview({
        fileUrl: URL.createObjectURL(result.blob),
        blob: result.blob,
        fileName: result.fileName || file.fileName,
        fileType: result.contentType || file.fileType,
        fileSize: file.fileSize,
      });
    } catch (error: unknown) {
      toast({ title: "Preview failed", description: getErrorMessage(error, "You may no longer have access to this file."), variant: "destructive" });
    }
  };

  const canEditFile = (file: FolderFile) => listing?.permissions.canManage || String(file.uploadedBy) === String(user?.id);

  return (
    <section className="space-y-3" aria-label="Project files">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Project Files</h3>
          <p className="text-xs text-muted-foreground">Private files and folders for this project.</p>
        </div>
        <div className="flex items-center gap-2">
          {listing?.permissions.canManage && <Button size="sm" variant="outline" className="h-8" onClick={() => setNewFolderOpen(true)} disabled={busy}><FolderPlus className="mr-1.5 h-3.5 w-3.5" />New folder</Button>}
          {listing?.permissions.canUpload && <Button size="sm" className="h-8" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="mr-1.5 h-3.5 w-3.5" />Upload</Button>}
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => void uploadFiles(event.target.files)} />
        </div>
      </header>

      {listing && (
        <nav className="flex flex-wrap items-center gap-1 text-xs" aria-label="Project folder breadcrumbs">
          {listing.breadcrumbs.map((crumb, index) => (
            <span key={crumb.id} className="inline-flex items-center gap-1">
              {index > 0 && <span className="text-muted-foreground">/</span>}
              <button type="button" className={index === listing.breadcrumbs.length - 1 ? "font-medium" : "text-primary-text hover:underline"} onClick={() => setFolderId(crumb.id)}>{crumb.name}</button>
            </span>
          ))}
        </nav>
      )}

      {loading ? <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading project files…</p>
        : !listing ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Project files are unavailable. Try refreshing.</div>
          : <>
            <div className="divide-y rounded-lg border">
              {listing.folder.id !== listing.rootFolder.id && (
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/40" onClick={() => setFolderId(listing.breadcrumbs.at(-2)?.id || listing.rootFolder.id)}>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />Parent folder
                </button>
              )}
              {listing.folders.map((folder) => (
                <div key={folder.id} className="flex items-center gap-2 px-3 py-2">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:text-primary-text" onClick={() => setFolderId(folder.id)}>
                    <Folder className="h-4 w-4 shrink-0 text-primary-text" /><span className="truncate">{folder.name}</span>
                  </button>
                  {listing.permissions.canManage && <>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Rename ${folder.name}`} onClick={() => openEdit({ type: "folder", action: "rename", id: folder.id, name: folder.name, folderId: folder.parentId || listing.rootFolder.id })}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move ${folder.name}`} onClick={() => openEdit({ type: "folder", action: "move", id: folder.id, name: folder.name, folderId: folder.parentId || listing.rootFolder.id })}><ArrowLeft className="h-3.5 w-3.5 rotate-180" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive-text" aria-label={`Delete ${folder.name}`} onClick={() => void removeFolder(folder)} disabled={busy}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>}
                </div>
              ))}
              {listing.files.map((file) => (
                <div key={file.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{file.fileName}</p>
                    <p className="text-[0.6875rem] text-muted-foreground">{file.fileType || "File"} · {formatTaskDeadline(file.createdAt)}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Preview ${file.fileName}`} onClick={() => void previewFile(file)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Download ${file.fileName}`} onClick={() => void downloadFile(file)}><Download className="h-3.5 w-3.5" /></Button>
                  {canEditFile(file) && <>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Rename ${file.fileName}`} onClick={() => openEdit({ type: "file", action: "rename", id: file.id, name: file.fileName, folderId: file.folderId })}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move ${file.fileName}`} onClick={() => openEdit({ type: "file", action: "move", id: file.id, name: file.fileName, folderId: file.folderId })} disabled={listing.folderOptions.length < 2}><ArrowLeft className="h-3.5 w-3.5 rotate-180" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive-text" aria-label={`Delete ${file.fileName}`} onClick={() => void removeFile(file)} disabled={busy}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>}
                </div>
              ))}
              {!listing.folders.length && !listing.files.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">This folder is empty.</p>}
            </div>
          </>}

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create project folder</DialogTitle><DialogDescription>The folder will be visible only to members who can access this project.</DialogDescription></DialogHeader>
          <Input autoFocus value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} maxLength={255} placeholder="Folder name" onKeyDown={(event) => event.key === "Enter" && void createFolder()} />
          <DialogFooter><Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button><Button onClick={() => void createFolder()} disabled={!newFolderName.trim() || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}Create folder</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget?.action === "rename" ? "Rename item" : "Move item"}</DialogTitle><DialogDescription>Changes apply only within this project’s file space.</DialogDescription></DialogHeader>
          {editTarget?.action === "rename"
            ? <Input autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} maxLength={255} aria-label="New name" />
            : <Select value={editFolderId} onValueChange={setEditFolderId}><SelectTrigger aria-label="Destination folder"><SelectValue placeholder="Choose a destination" /></SelectTrigger><SelectContent>{editTarget && moveableFolders(editTarget).map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.id === listing?.rootFolder.id ? "Project root" : folder.name}</SelectItem>)}</SelectContent></Select>}
          <DialogFooter><Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button><Button onClick={() => void saveEdit()} disabled={busy || (editTarget?.action === "rename" && !editValue.trim())}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <FileViewer file={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
