import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Folder, FolderFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Tab = "workspace" | "personal";

export default function Drive() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("workspace");
  const [workspaceFolders, setWorkspaceFolders] = useState<Folder[]>([]);
  const [personalFolders, setPersonalFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);

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
      setLoading(true);
      const res = await api.listFilesInFolder(folder.id);
      const arr = (res as any)?.data?.files || (res as any)?.files || [];
      setFiles(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      toast({ title: "Failed to load files", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Drive</h1>
        </div>

        <div className="flex gap-3 mb-4">
          <Button variant={tab === "workspace" ? "default" : "outline"} onClick={() => setTab("workspace")}>Workspace</Button>
          <Button variant={tab === "personal" ? "default" : "outline"} onClick={() => setTab("personal")}>Personal</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4 border border-border">
            <h2 className="font-semibold mb-3">Folders</h2>
            {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
            {!loading && (
              <ul className="space-y-2">
                {(tab === "workspace" ? workspaceFolders : personalFolders).map((f) => (
                  <li key={f.id}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg border ${selectedFolder?.id === f.id ? "border-primary text-primary" : "border-border"}`}
                      onClick={() => {
                        setSelectedFolder(f);
                        loadFiles(f);
                      }}
                    >
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.scope}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 mt-4">
              <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="New folder name" />
              <Button onClick={createFolder} disabled={loading || !folderName.trim()}>Create</Button>
            </div>
          </Card>

          <Card className="p-4 border border-border md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Files</h2>
              <div className="flex items-center gap-2">
                <Input type="file" multiple onChange={(e) => setPendingFiles(e.target.files)} />
                <Button onClick={doUpload} disabled={uploading || !selectedFolder || !pendingFiles || pendingFiles.length === 0}>Upload</Button>
              </div>
            </div>
            {selectedFolder ? (
              files.length > 0 ? (
                <ul className="space-y-2">
                  {files.map((file) => (
                    <li key={file.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">{file.fileType} • {(file.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                      <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No files in this folder</p>
              )
            ) : (
              <p className="text-muted-foreground text-sm">Select a folder</p>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

