import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Folder, FolderFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import FileViewer from "@/components/FileViewer";
import { getFileIcon } from "@/utils/fileIcons";
import {
  FolderIcon,
  FolderPlus,
  Upload,
  Trash2,
  Search,
  HardDrive,
  User,
  Eye,
  ChevronLeft,
  Loader2,
  Briefcase,
  Files,
  FileText,
  Image as ImageIcon,
  FileType,
  Presentation,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileCode,
  X,
} from "lucide-react";

type FileTypeFilter =
  | "all"
  | "pdf"
  | "image"
  | "word"
  | "ppt"
  | "excel"
  | "video"
  | "audio"
  | "text";

const FILTER_OPTIONS: { id: FileTypeFilter; label: string; icon: any }[] = [
  { id: "all", label: "All", icon: Files },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "word", label: "Word", icon: FileType },
  { id: "ppt", label: "PPT", icon: Presentation },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
  { id: "video", label: "Video", icon: FileVideo },
  { id: "audio", label: "Audio", icon: FileAudio },
  { id: "text", label: "Text", icon: FileCode },
];

const matchesType = (file: { fileName: string; fileType: string }, filter: FileTypeFilter) => {
  if (filter === "all") return true;
  const ext = file.fileName.split(".").pop()?.toLowerCase() || "";
  const mime = (file.fileType || "").toLowerCase();
  switch (filter) {
    case "pdf":
      return mime === "application/pdf" || ext === "pdf";
    case "image":
      return mime.startsWith("image/") ||
        ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext);
    case "word":
      return ["doc", "docx", "odt", "rtf"].includes(ext) || mime.includes("msword") || mime.includes("wordprocessingml");
    case "ppt":
      return ["ppt", "pptx", "odp", "key"].includes(ext) || mime.includes("presentation");
    case "excel":
      return ["xls", "xlsx", "csv", "ods"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel");
    case "video":
      return mime.startsWith("video/") || ["mp4", "webm", "mov", "m4v", "ogv", "mkv"].includes(ext);
    case "audio":
      return mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext);
    case "text":
      return mime.startsWith("text/") ||
        ["txt", "md", "log", "json", "xml", "yml", "yaml", "js", "ts", "tsx", "jsx", "css", "html"].includes(ext);
    default:
      return true;
  }
};

type Tab = "workspace" | "personal";

const formatBytes = (b: number) => {
  if (!b) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(b) / Math.log(k)));
  return `${(b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

export default function Drive() {
  const { toast } = useToast();
  const { workspaceRole } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const [tab, setTab] = useState<Tab>("workspace");
  const [workspaceFolders, setWorkspaceFolders] = useState<Folder[]>([]);
  const [personalFolders, setPersonalFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [search, setSearch] = useState("");
  const [previewFile, setPreviewFile] = useState<FolderFile | null>(null);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; size: number; done: boolean }[]>([]);


  const canUploadWorkspaceFiles = canPerformRoleOperation("upload_workspace_files", workspaceRole);
  const tabDisabled = tab === "workspace" && !canUploadWorkspaceFiles;

  const loadFolders = async () => {
    try {
      setLoading(true);
      const wsRes = await api.listWorkspaceFolders();
      const wsArr = (wsRes as any)?.data?.folders || (wsRes as any)?.folders || [];
      setWorkspaceFolders(Array.isArray(wsArr) ? wsArr : []);

      const pRes = await api.listPersonalFolders();
      const pArr = (pRes as any)?.data?.folders || (pRes as any)?.folders || [];
      setPersonalFolders(Array.isArray(pArr) ? pArr : []);
    } catch (err: any) {
      toast({ title: "Failed to load folders", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (folder: Folder) => {
    try {
      setFilesLoading(true);
      const res = await api.listFilesInFolder(folder.id);
      const arr = (res as any)?.data?.files || (res as any)?.files || [];
      setFiles(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      toast({ title: "Failed to load files", description: err.message, variant: "destructive" });
    } finally {
      setFilesLoading(false);
    }
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    try {
      setLoading(true);
      if (tab === "workspace") {
        await api.createWorkspaceFolder({ name: folderName });
      } else {
        await api.createPersonalFolder({ name: folderName });
      }
      setFolderName("");
      await loadFolders();
      toast({ title: "Folder created" });
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (file: FolderFile) => {
    if (!selectedFolder) return;
    if (!window.confirm(`Delete "${file.fileName}"? This cannot be undone.`)) return;
    try {
      await api.deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast({ title: "File deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    if (!window.confirm(`Delete "${folder.name}"? This removes all files inside.`)) return;
    try {
      setLoading(true);
      await api.deleteFolder(folder.id);
      await loadFolders();
      toast({ title: "Folder deleted" });
    } catch (err: any) {
      if (err.status === 403) {
        toast({ title: "Delete failed", description: "Only the folder owner can delete.", variant: "destructive" });
      } else {
        toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const doUpload = async () => {
    if (!selectedFolder || !pendingFiles || pendingFiles.length === 0) return;
    try {
      setUploading(true);
      await api.uploadFilesToFolder(selectedFolder.id, Array.from(pendingFiles));
      await loadFiles(selectedFolder);
      toast({ title: "Uploaded" });
      setPendingFiles(null);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    const list = tab === "workspace" ? workspaceFolders : personalFolders;
    const first = list[0] || null;
    setSelectedFolder(first);
    if (first) loadFiles(first);
    else setFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, workspaceFolders, personalFolders]);

  const folders = tab === "workspace" ? workspaceFolders : personalFolders;

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.toLowerCase();
    return files.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [files, search]);

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + (f.fileSize || 0), 0), [files]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 animate-fade-in">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-transparent p-5 sm:p-7">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <HardDrive className="h-3.5 w-3.5" />
                Drive
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Your Files</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload, organize and preview files without leaving the app.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={tab === "workspace" ? "default" : "outline"}
                onClick={() => { setTab("workspace"); setShowSidebarOnMobile(true); }}
                className="gap-2"
              >
                <Briefcase className="h-4 w-4" /> Workspace
              </Button>
              <Button
                variant={tab === "personal" ? "default" : "outline"}
                onClick={() => { setTab("personal"); setShowSidebarOnMobile(true); }}
                className="gap-2"
              >
                <User className="h-4 w-4" /> Personal
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Sidebar / Folders */}
          <div
            className={`lg:col-span-4 xl:col-span-3 ${
              showSidebarOnMobile ? "block" : "hidden"
            } lg:block`}
          >
            <Card className="p-4 border border-border h-full">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <FolderIcon className="h-4 w-4 text-primary" /> Folders
                </h2>
                <Badge variant="secondary">{folders.length}</Badge>
              </div>

              <div className="flex gap-2 mb-4">
                <Input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="New folder name"
                  onKeyDown={(e) => e.key === "Enter" && createFolder()}
                />
                <Button
                  onClick={createFolder}
                  disabled={loading || !folderName.trim() || tabDisabled}
                  size="icon"
                  title="Create folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>

              {loading && folders.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <FolderIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  No folders yet
                </div>
              ) : (
                <ul className="space-y-1.5 max-h-[55vh] overflow-auto pr-1">
                  {folders.map((f) => {
                    const active = selectedFolder?.id === f.id;
                    return (
                      <li key={f.id}>
                        <div
                          className={`group flex items-center gap-2 rounded-lg border transition-all ${
                            active
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-transparent hover:border-border hover:bg-muted/50"
                          }`}
                        >
                          <button
                            className="flex-1 text-left px-3 py-2.5 flex items-center gap-2 min-w-0"
                            onClick={() => {
                              setSelectedFolder(f);
                              loadFiles(f);
                              setShowSidebarOnMobile(false);
                            }}
                          >
                            <FolderIcon
                              className={`h-4 w-4 shrink-0 ${
                                active ? "text-primary" : "text-muted-foreground"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate text-sm">{f.name}</div>
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {f.scope}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(f);
                            }}
                            disabled={loading || tabDisabled}
                            className="p-2 mr-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition disabled:opacity-30"
                            title="Delete folder"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {tab === "workspace" && !canUploadWorkspaceFiles && (
                <p className="text-xs text-muted-foreground mt-3">
                  Workspace uploads & folder creation are disabled by policy.
                </p>
              )}
            </Card>
          </div>

          {/* Files area */}
          <div
            className={`lg:col-span-8 xl:col-span-9 ${
              !showSidebarOnMobile ? "block" : "hidden"
            } lg:block`}
          >
            <Card className="p-4 sm:p-5 border border-border">
              {/* Toolbar */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setShowSidebarOnMobile(true)}
                    title="Back to folders"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold truncate">
                      {selectedFolder?.name || "No folder selected"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {files.length} file{files.length === 1 ? "" : "s"} • {formatBytes(totalSize)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search files…"
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => setPendingFiles(e.target.files)}
                      disabled={tabDisabled}
                      className="flex-1 sm:max-w-[220px]"
                    />
                    <Button
                      onClick={doUpload}
                      disabled={
                        uploading ||
                        !selectedFolder ||
                        !pendingFiles ||
                        pendingFiles.length === 0 ||
                        tabDisabled
                      }
                      className="gap-2"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload
                    </Button>
                  </div>
                </div>
              </div>

              {/* Files */}
              {!selectedFolder ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FolderIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Select or create a folder to view files</p>
                </div>
              ) : filesLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading files…
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>
                    {search
                      ? "No files match your search"
                      : "This folder is empty — upload your first file"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredFiles.map((file) => {
                    const Icon = getFileIcon(file.fileType, file.fileName);
                    const isImage = file.fileType?.startsWith("image/");
                    return (
                      <div
                        key={file.id}
                        className="group relative border border-border rounded-xl overflow-hidden bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer animate-fade-in"
                        onClick={() => setPreviewFile(file)}
                      >
                        <div className="aspect-square bg-muted/40 flex items-center justify-center relative overflow-hidden">
                          {isImage ? (
                            <img
                              src={file.fileUrl}
                              alt={file.fileName}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Icon className="h-12 w-12 text-primary/70 group-hover:scale-110 transition-transform" />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file);
                            }}
                            disabled={tabDisabled}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-background/90 backdrop-blur text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition disabled:opacity-30"
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium truncate" title={file.fileName}>
                            {file.fileName}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatBytes(file.fileSize || 0)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <FileViewer
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </DashboardLayout>
  );
}
