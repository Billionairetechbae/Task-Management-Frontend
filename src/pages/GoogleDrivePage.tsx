import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import useGoogleDrive from "@/hooks/useGoogleDrive";
import useGoogleIntegrationStatus from "@/hooks/use-google-integration";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FileViewer from "@/components/FileViewer";
import { getFileIcon } from "@/utils/fileIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderIcon,
  FolderPlus,
  Upload,
  Trash2,
  Search,
  HardDrive,
  Eye,
  Loader2,
  Download,
} from "lucide-react";

const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const getFileUrl = (file: any) => {
  return file.webContentLink || file.webViewLink || file.thumbnailLink || "";
};

const isFolder = (file: { mimeType?: string }) => file.mimeType === "application/vnd.google-apps.folder";

export default function GoogleDrivePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: integrationStatus, isLoading: integrationLoading } = useGoogleIntegrationStatus();
  const {
    view,
    setView,
    currentFolder,
    breadcrumbs,
    displayedFiles,
    searchQuery,
    setSearchQuery,
    loading,
    searching,
    uploading,
    deleting,
    nextPageToken,
    createFolder,
    removeFile,
    uploadFile,
    loadMore,
    openFolder,
    openBreadcrumb,
    refresh,
    downloadFile,
  } = useGoogleDrive();
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const connected = Boolean(integrationStatus?.connected);

  const folderItems = useMemo(
    () => displayedFiles.filter(isFolder),
    [displayedFiles]
  );

  const fileItems = useMemo(
    () => displayedFiles.filter((item) => !isFolder(item)),
    [displayedFiles]
  );

  const handleBrowseShared = () => setView("shared");
  const handleBrowseMyDrive = () => setView("my-drive");

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName("");
      toast({ title: "Folder created" });
    } catch (error: any) {
      toast({ title: "Folder creation failed", description: error?.message || "Unable to create folder", variant: "destructive" });
    }
  };

  const handleUploadFile = async () => {
    if (!pendingFile) return;
    try {
      await uploadFile(pendingFile);
      setPendingFile(null);
      toast({ title: "Upload successful" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error?.message || "Unable to upload file", variant: "destructive" });
    }
  };

  const handleDeleteFile = async (file: any) => {
    if (!window.confirm(`Delete "${file.name}"? This action cannot be undone.`)) return;
    try {
      await removeFile(file.id);
      toast({ title: "File deleted" });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "Unable to delete file", variant: "destructive" });
    }
  };

  const handleDownloadFile = async (file: any) => {
    try {
      const blob = await downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Download failed", description: error?.message || "Unable to download file", variant: "destructive" });
    }
  };

  if (!connected && !integrationLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12">
          <Card className="border border-border p-8 text-center">
            <HardDrive className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Google Drive</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your Google account to browse Drive files, upload documents, and attach content across the workspace.
            </p>
            <Button onClick={() => navigate("/settings/integrations")}>Connect Google</Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-transparent p-5 sm:p-7">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <HardDrive className="h-3.5 w-3.5" />
                Google Drive
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Google Drive</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Browse your Drive files and manage attachments through the backend API.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant={view === "my-drive" ? "default" : "outline"} onClick={handleBrowseMyDrive}>
                My Drive
              </Button>
              <Button variant={view === "shared" ? "default" : "outline"} onClick={handleBrowseShared}>
                Shared with Me
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="p-4 border border-border h-full">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <FolderIcon className="h-4 w-4 text-primary" /> Folder
                </h2>
                <Badge variant="secondary">{folderItems.length}</Badge>
              </div>

              <div className="flex gap-2 mb-4">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                />
                <Button onClick={handleCreateFolder} size="icon" title="Create folder" disabled={loading || !newFolderName.trim() || view === "shared"}>
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex flex-wrap gap-1">
                  {breadcrumbs.map((folder, index) => (
                    <button
                      key={folder.id}
                      onClick={() => openBreadcrumb(index)}
                      className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/80"
                    >
                      {folder.name}
                    </button>
                  ))}
                </div>
              </div>

              {loading && folderItems.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : folderItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <FolderIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  No folders found
                </div>
              ) : (
                <ul className="space-y-1.5 max-h-[55vh] overflow-auto pr-1">
                  {folderItems.map((folder) => (
                    <li key={folder.id}>
                      <button
                        onClick={() => openFolder(folder)}
                        className="w-full flex items-center gap-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 p-3 text-left"
                      >
                        <FolderIcon className="h-4 w-4 text-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{folder.name}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            <Card className="p-4 sm:p-5 border border-border">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold truncate">{currentFolder?.name || "Drive"}</h2>
                    <p className="text-xs text-muted-foreground">
                      {displayedFiles.length} item{displayedFiles.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files…"
                        className="pl-9"
                      />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setPendingFile(file);
                        }}
                        disabled={view === "shared"}
                        className="flex-1 sm:max-w-[220px]"
                      />
                      <Button
                        onClick={handleUploadFile}
                        disabled={!pendingFile || view === "shared" || uploading}
                        className="gap-2"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>

                {(loading || searching) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {searching ? "Searching…" : "Loading…"}
                  </div>
                )}
              </div>

              {!currentFolder && !loading ? (
                <div className="text-center py-16 text-muted-foreground">
                  <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Select a folder to get started.</p>
                </div>
              ) : displayedFiles.length === 0 && !loading ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>{searchQuery ? "No files match your search" : "This folder is empty"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {displayedFiles.map((file) => {
                    const Icon = getFileIcon(file.mimeType || "", file.name);
                    const isImage = (file.mimeType || "").startsWith("image/");
                    const fileUrl = getFileUrl(file);
                    return (
                      <div key={file.id} className="group relative border border-border rounded-xl overflow-hidden bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedFile({ ...file, fileUrl })}>
                        <div className="aspect-square bg-muted/40 flex items-center justify-center relative overflow-hidden">
                          {isImage && file.thumbnailLink ? (
                            <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <Icon className="h-12 w-12 text-primary/70 group-hover:scale-110 transition-transform" />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(file);
                              }}
                              className="p-2 rounded-md bg-background/90 text-muted-foreground hover:text-foreground"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file);
                              }}
                              className="p-2 rounded-md bg-background/90 text-muted-foreground hover:text-destructive"
                              title="Delete"
                              disabled={deleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(Number(file.size) || 0)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {nextPageToken && !loading && (
                <div className="mt-4 text-center">
                  <Button onClick={loadMore} variant="outline" size="sm">
                    Load More
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <FileViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
    </DashboardLayout>
  );
}
