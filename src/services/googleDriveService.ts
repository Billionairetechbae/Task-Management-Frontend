import { api } from "@/lib/api";
import type {
  DriveFolder,
  DriveSearchResponse,
  DriveUploadResponse,
  GoogleDriveFile,
} from "@/types/googleDrive";

const buildAuthHeaders = (includeWorkspace = true): HeadersInit => {
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
  const activeCompanyId = localStorage.getItem("activeCompanyId");
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (includeWorkspace && activeCompanyId) {
    headers["x-company-id"] = activeCompanyId;
  }

  return headers;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const googleDriveService = {
  async listFiles(params: {
    folderId?: string;
    pageSize?: number;
    pageToken?: string;
    query?: string;
    orderBy?: string;
  }): Promise<DriveSearchResponse> {
    return api.get<DriveSearchResponse>(`/api/google-drive/files`, {
      params: {
        folderId: params.folderId,
        pageSize: params.pageSize,
        pageToken: params.pageToken,
        query: params.query,
        orderBy: params.orderBy,
      },
    });
  },

  async searchFiles(params: {
    q: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<DriveSearchResponse> {
    return api.get<DriveSearchResponse>(`/api/google-drive/search`, {
      params: {
        q: params.q,
        pageSize: params.pageSize,
        pageToken: params.pageToken,
      },
    });
  },

  async getFile(fileId: string, includeContent = false): Promise<GoogleDriveFile> {
    return api.get<GoogleDriveFile>(`/api/google-drive/files/${fileId}`, {
      params: {
        includeContent: includeContent ? "true" : undefined,
      },
    });
  },

  async downloadFile(fileId: string): Promise<Blob> {
    const url = `${API_BASE_URL}/api/google-drive/download/${encodeURIComponent(fileId)}`;
    const headers = buildAuthHeaders();
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Download failed (${response.status})`);
    }
    return response.blob();
  },

  async uploadFile(options: {
    file: File;
    fileName?: string;
    folderId?: string;
    description?: string;
    shareWithTaskTeam?: boolean;
  }): Promise<DriveUploadResponse> {
    const form = new FormData();
    form.append("file", options.file);
    form.append("fileName", options.fileName ?? options.file.name);
    if (options.folderId) form.append("folderId", options.folderId);
    if (options.description) form.append("description", options.description);
    if (options.shareWithTaskTeam !== undefined) {
      form.append("shareWithTaskTeam", String(options.shareWithTaskTeam));
    }

    return api.request<DriveUploadResponse>(`/api/google-drive/upload`, {
      method: "POST",
      headers: buildAuthHeaders(true),
      body: form,
    });
  },

  async uploadToTask(taskId: string, options: {
    file: File;
    fileName?: string;
    folderId?: string;
    description?: string;
    shareWithTaskTeam?: boolean;
  }): Promise<DriveUploadResponse> {
    const form = new FormData();
    form.append("file", options.file);
    form.append("fileName", options.fileName ?? options.file.name);
    if (options.folderId) form.append("folderId", options.folderId);
    if (options.description) form.append("description", options.description);
    if (options.shareWithTaskTeam !== undefined) {
      form.append("shareWithTaskTeam", String(options.shareWithTaskTeam));
    }

    return api.request<DriveUploadResponse>(`/api/google-drive/upload-to-task/${encodeURIComponent(taskId)}`, {
      method: "POST",
      headers: buildAuthHeaders(true),
      body: form,
    });
  },

  async deleteFile(fileId: string): Promise<void> {
    await api.request(`/api/google-drive/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: buildAuthHeaders(),
    });
  },

  async createFolder(data: { folderName: string; parentFolderId?: string }): Promise<DriveFolder> {
    return api.request<DriveFolder>(`/api/google-drive/folders`, {
      method: "POST",
      headers: { ...buildAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async getRootFolder(): Promise<DriveFolder> {
    return api.get<DriveFolder>(`/api/google-drive/root`);
  },

  async listSharedFiles(params: { pageSize?: number; pageToken?: string }): Promise<DriveSearchResponse> {
    return api.get<DriveSearchResponse>(`/api/google-drive/shared`, {
      params: {
        pageSize: params.pageSize,
        pageToken: params.pageToken,
      },
    });
  },

  async moveFile(fileId: string, newParentFolderId: string): Promise<void> {
    await api.request(`/api/google-drive/move/${encodeURIComponent(fileId)}`, {
      method: "POST",
      headers: { ...buildAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ newParentFolderId }),
    });
  },

  async exportFile(fileId: string): Promise<string> {
    const url = `${API_BASE_URL}/api/google-drive/export/${encodeURIComponent(fileId)}`;
    const headers = buildAuthHeaders();
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Export failed (${response.status})`);
    }
    return response.text();
  },
};
