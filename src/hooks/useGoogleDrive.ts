import { useCallback, useEffect, useMemo, useState } from "react";
import { googleDriveService } from "@/services/googleDriveService";
import type { DriveFolder, GoogleDriveFile } from "@/types/googleDrive";

export type GoogleDriveView = "my-drive" | "shared";

export const useGoogleDrive = (initialView: GoogleDriveView = "my-drive") => {
  const [view, setView] = useState<GoogleDriveView>(initialView);
  const [rootFolder, setRootFolder] = useState<DriveFolder | null>(null);
  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<DriveFolder[]>([]);
  const [items, setItems] = useState<GoogleDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GoogleDriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const pageSize = 50;

  const listFolderFiles = useCallback(
    async (folderId?: string, pageToken?: string) => {
      setLoading(true);
      try {
        const response = await googleDriveService.listFiles({
          folderId,
          pageSize,
          pageToken,
          orderBy: "modifiedTime desc",
        });
        setItems(response.files ?? []);
        setNextPageToken(response.nextPageToken);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  const listSharedFiles = useCallback(
    async (pageToken?: string) => {
      setLoading(true);
      try {
        const response = await googleDriveService.listSharedFiles({
          pageSize,
          pageToken,
        });
        setItems(response.files ?? []);
        setNextPageToken(response.nextPageToken);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  const loadRootFolder = useCallback(async () => {
    setLoading(true);
    try {
      const root = await googleDriveService.getRootFolder();
      setRootFolder(root);
      setCurrentFolder(root);
      setBreadcrumbs([root]);
      await listFolderFiles(root.id);
    } finally {
      setLoading(false);
    }
  }, [listFolderFiles]);

  const refresh = useCallback(async () => {
    if (searchQuery.trim()) {
      return;
    }

    if (view === "shared") {
      await listSharedFiles();
      return;
    }

    if (currentFolder) {
      await listFolderFiles(currentFolder.id);
      return;
    }

    await loadRootFolder();
  }, [currentFolder, listFolderFiles, listSharedFiles, loadRootFolder, searchQuery, view]);

  const openFolder = useCallback(
    async (folder: DriveFolder) => {
      setCurrentFolder(folder);
      setBreadcrumbs((previous) => {
        const existingIndex = previous.findIndex((item) => item.id === folder.id);
        if (existingIndex >= 0) {
          return previous.slice(0, existingIndex + 1);
        }
        return [...previous, folder];
      });
      setSearchQuery("");
      setSearchResults([]);
      await listFolderFiles(folder.id);
    },
    [listFolderFiles]
  );

  const openBreadcrumb = useCallback(
    async (index: number) => {
      const target = breadcrumbs[index];
      if (!target) return;
      setCurrentFolder(target);
      setBreadcrumbs((previous) => previous.slice(0, index + 1));
      setSearchQuery("");
      setSearchResults([]);
      await listFolderFiles(target.id);
    },
    [breadcrumbs, listFolderFiles]
  );

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        await refresh();
        return;
      }

      setSearching(true);
      try {
        const response = await googleDriveService.searchFiles({
          q: query,
          pageSize,
        });
        setSearchResults(response.files ?? []);
        setNextPageToken(response.nextPageToken);
      } finally {
        setSearching(false);
      }
    },
    [pageSize, refresh]
  );

  const loadMore = useCallback(async () => {
    if (!nextPageToken) return;
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const response = await googleDriveService.searchFiles({
          q: searchQuery,
          pageSize,
          pageToken: nextPageToken,
        });
        setSearchResults((previous) => [...previous, ...(response.files ?? [])]);
        setNextPageToken(response.nextPageToken);
        return;
      }

      if (view === "shared") {
        const response = await googleDriveService.listSharedFiles({
          pageSize,
          pageToken: nextPageToken,
        });
        setItems((previous) => [...previous, ...(response.files ?? [])]);
        setNextPageToken(response.nextPageToken);
        return;
      }

      const response = await googleDriveService.listFiles({
        folderId: currentFolder?.id,
        pageSize,
        pageToken: nextPageToken,
      });
      setItems((previous) => [...previous, ...(response.files ?? [])]);
      setNextPageToken(response.nextPageToken);
    } finally {
      setLoading(false);
    }
  }, [currentFolder?.id, nextPageToken, pageSize, searchQuery, view]);

  const createFolder = useCallback(
    async (folderName: string) => {
      if (!folderName.trim()) {
        throw new Error("Folder name is required");
      }
      setLoading(true);
      try {
        await googleDriveService.createFolder({
          folderName,
          parentFolderId: currentFolder?.id,
        });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [currentFolder?.id, refresh]
  );

  const removeFile = useCallback(
    async (fileId: string) => {
      setDeleting(true);
      try {
        await googleDriveService.deleteFile(fileId);
        setItems((previous) => previous.filter((item) => item.id !== fileId));
        setSearchResults((previous) => previous.filter((item) => item.id !== fileId));
      } finally {
        setDeleting(false);
      }
    },
    []
  );

  const uploadFile = useCallback(
    async (file: File, description?: string, shareWithTaskTeam?: boolean) => {
      if (!file) {
        throw new Error("No file selected");
      }
      setUploading(true);
      try {
        await googleDriveService.uploadFile({
          file,
          folderId: currentFolder?.id,
          description,
          shareWithTaskTeam,
        });
        await refresh();
      } finally {
        setUploading(false);
      }
    },
    [currentFolder?.id, refresh]
  );

  const uploadToTask = useCallback(
    async (
      taskId: string,
      file: File,
      description?: string,
      shareWithTaskTeam?: boolean
    ) => {
      if (!file) {
        throw new Error("No file selected");
      }
      setUploading(true);
      try {
        await googleDriveService.uploadToTask(taskId, {
          file,
          description,
          shareWithTaskTeam,
        });
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const moveFile = useCallback(async (fileId: string, newParentFolderId: string) => {
    setMoving(true);
    try {
      await googleDriveService.moveFile(fileId, newParentFolderId);
      await refresh();
    } finally {
      setMoving(false);
    }
  }, [refresh]);

  const downloadFile = useCallback(async (fileId: string) => {
    setDownloading(true);
    try {
      return await googleDriveService.downloadFile(fileId);
    } finally {
      setDownloading(false);
    }
  }, []);

  const exportFile = useCallback(async (fileId: string) => {
    return await googleDriveService.exportFile(fileId);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      void search(debouncedQuery);
      return;
    }
    void refresh();
  }, [debouncedQuery, refresh, search]);

  useEffect(() => {
    if (view === "shared") {
      void listSharedFiles();
      return;
    }
    void loadRootFolder();
  }, [listSharedFiles, loadRootFolder, view]);

  const displayedFiles = useMemo(
    () => (searchQuery.trim() ? searchResults : items),
    [items, searchQuery, searchResults]
  );

  return {
    view,
    setView,
    rootFolder,
    currentFolder,
    breadcrumbs,
    displayedFiles,
    searchQuery,
    setSearchQuery,
    searchResults,
    loading,
    searching,
    uploading,
    deleting,
    moving,
    downloading,
    nextPageToken,
    createFolder,
    removeFile,
    uploadFile,
    uploadToTask,
    moveFile,
    downloadFile,
    exportFile,
    loadMore,
    openFolder,
    openBreadcrumb,
    refresh,
  };
};

export default useGoogleDrive;
