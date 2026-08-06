import { api } from "@/lib/api";
import type { GoogleDriveFile } from "@/types/googleDrive";

const API_PREFIX = "/integrations/google";

export interface GoogleIntegrationStatus {
  connected: boolean;
  email?: string;
  scopes?: string[];
  connectedAt?: string;
  error?: string;
}

export interface GoogleConnectResponse {
  authUrl?: string;
  url?: string;
  status?: string;
}

export interface GoogleDriveFilesResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
  hasMore?: boolean;
  totalItems?: number;
}

export interface GoogleDriveUploadResponse {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  status: "success" | string;
  message?: string;
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
  const activeCompanyId = localStorage.getItem("activeCompanyId");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (activeCompanyId) headers["x-company-id"] = activeCompanyId;
  return headers;
};

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

export const googleIntegrationService = {
  /* ======= INTEGRATION LIFECYCLE ======= */

  async getStatus(): Promise<GoogleIntegrationStatus> {
    const res = await api.get<any>(`${API_PREFIX}/status`);
    const data = (res as any)?.data ?? res ?? {};
    return {
      connected: Boolean(data.connected),
      email: data.email ?? data.accountEmail,
      scopes: data.scopes ?? data.capabilities ?? [],
      connectedAt: data.connectedAt,
      error: data.error,
    };
  },

  async getConnectUrl(): Promise<string> {
    try {
      const res = await api.get<any>(`${API_PREFIX}/connect`);
      const data = (res as any)?.data ?? res ?? {};
      return data.authUrl || data.url || data.redirectUrl || "";
    } catch {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
      const companyId = localStorage.getItem("activeCompanyId") || "";
      const q = new URLSearchParams();
      if (token) q.set("token", token);
      if (companyId) q.set("companyId", companyId);
      return `${API_BASE_URL}${API_PREFIX}/connect${q.toString() ? `?${q.toString()}` : ""}`;
    }
  },

  async redirectToConnect(): Promise<void> {
    const url = await this.getConnectUrl();
    if (url) {
      sessionStorage.setItem("google_integration_return", window.location.pathname);
      window.location.href = url;
    } else {
      throw new Error("Could not generate Google Drive connect URL.");
    }
  },

  async disconnect(): Promise<void> {
    await api.request(`${API_PREFIX}/disconnect`, {
      method: "DELETE",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  },

  /* ======= GOOGLE DRIVE FILES ======= */

  async listFiles(params: {
    query?: string;
    folderId?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<GoogleDriveFilesResponse> {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.set("query", params.query);
    if (params.folderId) queryParams.set("folderId", params.folderId);
    if (params.pageToken) queryParams.set("pageToken", params.pageToken);
    if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

    const qs = queryParams.toString();
    const res = await api.get<any>(`${API_PREFIX}/files${qs ? `?${qs}` : ""}`);

    const payload = (res as any)?.data ?? res ?? {};
    const rawFiles: any[] = payload?.files ?? payload?.items ?? [];

    const files: GoogleDriveFile[] = rawFiles.map((raw) => ({
      fileId: String(raw?.fileId ?? raw?.id ?? ""),
      name: String(raw?.name ?? ""),
      mimeType: String(raw?.mimeType ?? raw?.fileType ?? "application/octet-stream"),
      webViewLink: raw?.webViewLink ?? null,
      webContentLink: raw?.webContentLink ?? null,
      thumbnailLink: raw?.thumbnailLink ?? null,
      iconLink: raw?.iconLink ?? null,
      size: raw?.size != null ? String(raw.size) : null,
      modifiedTime: raw?.modifiedTime ?? raw?.updatedAt ?? null,
      createdTime: raw?.createdTime ?? raw?.createdAt ?? null,
      parents: raw?.parents ?? undefined,
      owners: raw?.owners ?? undefined,
      starred: raw?.starred ?? undefined,
      trashed: raw?.trashed ?? undefined,
      id: raw?.id ?? undefined,
    }));

    // TEMPORARY diagnostic log: never logs credentials.
    // eslint-disable-next-line no-console
    console.log("Normalized Drive files:", files);

    return {
      files,
      nextPageToken: payload?.nextPageToken ?? null,
      hasMore:
        typeof payload?.hasMore === "boolean"
          ? payload.hasMore
          : Boolean(payload?.nextPageToken),
      totalItems:
        typeof payload?.total === "number"
          ? payload.total
          : typeof payload?.totalItems === "number"
          ? payload.totalItems
          : files.length,
    };
  },

  /* ======= UPLOAD ADMIINO FILE TO GOOGLE DRIVE ======= */

  async uploadAdmiinoFile(file: File | Blob, fileName?: string): Promise<GoogleDriveUploadResponse> {
    const form = new FormData();
    form.append("file", file, fileName || (file as File).name || "unnamed");
    if (fileName) form.append("fileName", fileName);

    const url = `${API_BASE_URL}${API_PREFIX}/upload`;
    const res = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
      body: form,
    });
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    if (!res.ok) {
      throw new Error(json?.message || `Upload failed (${res.status})`);
    }
    const d = json?.data ?? json ?? {};
    return {
      fileId: d.fileId ?? d.id,
      name: d.name ?? d.fileName ?? fileName ?? "",
      mimeType: d.mimeType ?? d.fileType ?? "",
      webViewLink: d.webViewLink,
      thumbnailLink: d.thumbnailLink,
      status: d.status ?? "success",
      message: d.message,
    };
  },
};

export default googleIntegrationService;
