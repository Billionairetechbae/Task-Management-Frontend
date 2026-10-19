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

/**
 * VITE_API_BASE_URL already ends in "/api/v1", and the backend mounts the Drive router at "/google-drive" under it.
 * Every path here is therefore relative to that base: never prefix it with "/api" (that produced /api/v1/api/google-drive/...).
 */
export const GOOGLE_DRIVE_PREFIX = "/google-drive";
export const googleDriveUrl = (path: string) => `${API_BASE_URL}${GOOGLE_DRIVE_PREFIX}${path}`;

/** Stable, secret-free error kinds produced by the backend (see backend/src/utils/googleDriveErrors.js). */
export type DriveErrorKind = "not_connected" | "reconnect" | "forbidden" | "quota" | "rate_limited" | "not_found" | "disabled" | "provider" | "unknown";
export class DriveError extends Error {
  kind: DriveErrorKind;
  constructor(kind: DriveErrorKind, message: string) { super(message); this.name = "DriveError"; this.kind = kind; }
}
const KIND_BY_CODE: Record<string, DriveErrorKind> = {
  GOOGLE_NOT_CONNECTED: "not_connected", GOOGLE_RECONNECT_REQUIRED: "reconnect", GOOGLE_PERMISSION_DENIED: "forbidden", GOOGLE_QUOTA_EXCEEDED: "quota",
  GOOGLE_RATE_LIMITED: "rate_limited", GOOGLE_NOT_FOUND: "not_found", GOOGLE_DRIVE_ERROR: "provider", googleDriveEnabled: "disabled",
};
/** Converts any thrown value into a DriveError so the UI can show a distinct state for each failure. */
export const toDriveError = (error: unknown): DriveError => {
  if (error instanceof DriveError) return error;
  const e = error as { message?: string; statusCode?: number; body?: { code?: string } } | null;
  const code = e?.body?.code;
  const message = e?.message || "Google Drive request failed";
  if (code && KIND_BY_CODE[code]) return new DriveError(KIND_BY_CODE[code], message);
  if (e?.statusCode === 403 && /google.?drive|disabled/i.test(message)) return new DriveError("disabled", message);
  if (e?.statusCode === 404 && /route not found/i.test(message)) return new DriveError("unknown", "Google Drive is temporarily unavailable. Please try again later.");
  return new DriveError("unknown", message);
};

/** The API wraps results as { success, data }. Unwrap it, and give every file both `id` and `fileId`. */
const unwrap = <T,>(response: any): T => (response && typeof response === "object" && "data" in response && "success" in response ? response.data : response) as T;
const normalizeFile = (f: any): any => (f ? { ...f, id: f.id ?? f.fileId, fileId: f.fileId ?? f.id } : f);
const normalizeList = (response: any): DriveSearchResponse => {
  const data = unwrap<any>(response) || {};
  return { files: Array.isArray(data.files) ? data.files.map(normalizeFile) : [], nextPageToken: data.nextPageToken ?? null };
};
const guard = async <T,>(run: () => Promise<T>): Promise<T> => { try { return await run(); } catch (error) { throw toDriveError(error); } };
const failFromResponse = async (response: Response, fallback: string): Promise<never> => {
  let body: any = null; try { body = await response.json(); } catch { /* not JSON */ }
  throw toDriveError({ message: body?.message || `${fallback} (${response.status})`, statusCode: response.status, body });
};

export interface DriveUploadOptions { file: File; fileName?: string; folderId?: string; description?: string; shareWithTaskTeam?: boolean }
const uploadForm = (options: DriveUploadOptions) => {
  const form = new FormData();
  form.append("file", options.file);
  form.append("fileName", options.fileName ?? options.file.name);
  if (options.folderId) form.append("folderId", options.folderId);
  if (options.description) form.append("description", options.description);
  if (options.shareWithTaskTeam !== undefined) form.append("shareWithTaskTeam", String(options.shareWithTaskTeam));
  return form;
};

export const googleDriveService = {
  listFiles(params: { folderId?: string; pageSize?: number; pageToken?: string; query?: string; orderBy?: string }): Promise<DriveSearchResponse> {
    return guard(async () => normalizeList(await api.get(`${GOOGLE_DRIVE_PREFIX}/files`, { params: { folderId: params.folderId, pageSize: params.pageSize, pageToken: params.pageToken, query: params.query, orderBy: params.orderBy } })));
  },

  searchFiles(params: { q: string; pageSize?: number; pageToken?: string }): Promise<DriveSearchResponse> {
    return guard(async () => normalizeList(await api.get(`${GOOGLE_DRIVE_PREFIX}/search`, { params: { q: params.q, pageSize: params.pageSize, pageToken: params.pageToken } })));
  },

  getFile(fileId: string, includeContent = false): Promise<GoogleDriveFile> {
    return guard(async () => normalizeFile(unwrap(await api.get(`${GOOGLE_DRIVE_PREFIX}/files/${encodeURIComponent(fileId)}`, { params: { includeContent: includeContent ? "true" : undefined } }))));
  },

  async downloadFile(fileId: string): Promise<Blob> {
    return guard(async () => {
      const response = await fetch(googleDriveUrl(`/download/${encodeURIComponent(fileId)}`), { method: "GET", headers: buildAuthHeaders() });
      if (!response.ok) await failFromResponse(response, "Download failed");
      return response.blob();
    });
  },

  uploadFile(options: DriveUploadOptions): Promise<DriveUploadResponse> {
    return guard(async () => {
      const result = unwrap<any>(await api.request(`${GOOGLE_DRIVE_PREFIX}/upload`, { method: "POST", headers: buildAuthHeaders(true), body: uploadForm(options) }));
      // Success is only reported when the server returns the file Google created.
      if (!result || !(result.id || result.fileId)) throw new DriveError("provider", "Google did not confirm the upload.");
      return { file: normalizeFile(result) };
    });
  },

  uploadToTask(taskId: string, options: DriveUploadOptions): Promise<DriveUploadResponse> {
    return guard(async () => {
      const result = unwrap<any>(await api.request(`${GOOGLE_DRIVE_PREFIX}/upload-to-task/${encodeURIComponent(taskId)}`, { method: "POST", headers: buildAuthHeaders(true), body: uploadForm(options) }));
      const file = result?.driveFile;
      if (!file || !(file.id || file.fileId)) throw new DriveError("provider", "Google did not confirm the upload.");
      return { file: normalizeFile(file) };
    });
  },

  async deleteFile(fileId: string): Promise<void> {
    await guard(() => api.request(`${GOOGLE_DRIVE_PREFIX}/files/${encodeURIComponent(fileId)}`, { method: "DELETE", headers: buildAuthHeaders() }));
  },

  createFolder(data: { folderName: string; parentFolderId?: string }): Promise<DriveFolder> {
    return guard(async () => normalizeFile(unwrap(await api.request(`${GOOGLE_DRIVE_PREFIX}/folders`, { method: "POST", headers: { ...buildAuthHeaders(true), "Content-Type": "application/json" }, body: JSON.stringify(data) }))));
  },

  getRootFolder(): Promise<DriveFolder> {
    return guard(async () => normalizeFile(unwrap(await api.get(`${GOOGLE_DRIVE_PREFIX}/root`))));
  },

  listSharedFiles(params: { pageSize?: number; pageToken?: string }): Promise<DriveSearchResponse> {
    return guard(async () => normalizeList(await api.get(`${GOOGLE_DRIVE_PREFIX}/shared`, { params: { pageSize: params.pageSize, pageToken: params.pageToken } })));
  },

  async moveFile(fileId: string, newParentFolderId: string): Promise<void> {
    await guard(() => api.request(`${GOOGLE_DRIVE_PREFIX}/move/${encodeURIComponent(fileId)}`, { method: "POST", headers: { ...buildAuthHeaders(true), "Content-Type": "application/json" }, body: JSON.stringify({ newParentFolderId }) }));
  },

  async exportFile(fileId: string): Promise<string> {
    return guard(async () => {
      const response = await fetch(googleDriveUrl(`/export/${encodeURIComponent(fileId)}`), { method: "GET", headers: buildAuthHeaders() });
      if (!response.ok) await failFromResponse(response, "Export failed");
      return response.text();
    });
  },
};
