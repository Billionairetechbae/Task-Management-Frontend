// API client for the external client portal. Deliberately independent of lib/api.ts: external clients are NOT Admiino users, so this
// module never reads or sends the Admiino auth token, workspace header or any user state. Its only credential is a narrow,
// per-share session secret kept in this browser.
import type { ExternalClientComment } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5001/api/v1" : "");
const STORAGE_PREFIX = "admiino_external_session:";

export class ExternalSessionError extends Error {
  constructor(message = "Your access has expired or been revoked.") {
    super(message);
    this.name = "ExternalSessionError";
  }
}

export interface ExternalSharedView {
  organization: string;
  permission: "viewer" | "commenter";
  canComment: boolean;
  resourceType: "project" | "task";
  shareReference: string;
  accessExpiresAt: string | null;
  viewer: { email: string };
  task?: { title: string; description: string | null; status: string; dueDate: string | null };
  project?: {
    name: string; description: string | null; status: string; startDate: string | null; endDate: string | null; progress: number | null;
    tasks: Array<{ id: string; title: string; description: string | null; status: string; dueDate: string | null }>;
  };
}

const safeStorage = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* storage unavailable: the session just won't persist */ } },
  remove: (k: string) => { try { window.localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const getStoredSession = (shareReference: string) => safeStorage.get(STORAGE_PREFIX + shareReference);
export const clearStoredSession = (shareReference: string) => safeStorage.remove(STORAGE_PREFIX + shareReference);

async function call<T>(path: string, init: RequestInit = {}, session?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session) headers.Authorization = `External ${session}`;
  const res = await fetch(`${API_BASE_URL}/external-portal${path}`, { ...init, headers });
  let body: { code?: string; message?: string } = {};
  try { body = await res.json(); } catch { /* empty */ }
  if (res.status === 401) throw new ExternalSessionError(body?.code === "invalid_or_expired" ? body.message : undefined);
  if (!res.ok) throw new Error(body?.message || "Something went wrong. Please try again.");
  return body as T;
}

/** Exchanges the single-use token from the email link for a session scoped to this one share. */
export async function redeemInvitation(token: string): Promise<{ shareReference: string; resourceType: "project" | "task" }> {
  const res = await call<{ data: { sessionToken: string; shareReference: string; resourceType: "project" | "task" } }>("/redeem", { method: "POST", body: JSON.stringify({ token }) });
  safeStorage.set(STORAGE_PREFIX + res.data.shareReference, res.data.sessionToken);
  return { shareReference: res.data.shareReference, resourceType: res.data.resourceType };
}

export async function requestNewLink(shareReference: string, email: string): Promise<void> {
  await call("/request-link", { method: "POST", body: JSON.stringify({ shareReference, email }) });
}

export async function getSharedView(shareReference: string): Promise<ExternalSharedView> {
  const session = getStoredSession(shareReference);
  if (!session) throw new ExternalSessionError();
  return (await call<{ data: ExternalSharedView }>(`/shares/${encodeURIComponent(shareReference)}`, {}, session)).data;
}

export async function getSharedComments(shareReference: string): Promise<ExternalClientComment[]> {
  return (await call<{ data: { comments: ExternalClientComment[] } }>(`/shares/${encodeURIComponent(shareReference)}/comments`, {}, getStoredSession(shareReference))).data.comments;
}

export async function postSharedComment(shareReference: string, content: string): Promise<ExternalClientComment> {
  return (await call<{ data: { comment: ExternalClientComment } }>(`/shares/${encodeURIComponent(shareReference)}/comments`, { method: "POST", body: JSON.stringify({ content }) }, getStoredSession(shareReference))).data.comment;
}
