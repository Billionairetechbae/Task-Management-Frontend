const STORAGE_KEY = "pending_auth_return_path";
const MAX_AGE_MS = 30 * 60 * 1000;

export function safeInternalReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 2 || value.length > 2048) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const parsed = new URL(value, "https://app.admiino.invalid");
    const decodedPath = decodeURIComponent(parsed.pathname);
    if (parsed.origin !== "https://app.admiino.invalid" || decodedPath.startsWith("//") || decodedPath.includes("\\")) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function preserveAuthReturnPath(value: unknown): boolean {
  const safe = safeInternalReturnPath(value);
  if (!safe) return false;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path: safe, createdAt: Date.now() }));
  return true;
}

export function consumeAuthReturnPath(): string | null {
  let stored: { path?: unknown; createdAt?: unknown } | null = null;
  try { stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch { stored = null; }
  sessionStorage.removeItem(STORAGE_KEY);
  if (!stored || typeof stored.createdAt !== "number" || Date.now() - stored.createdAt > MAX_AGE_MS) return null;
  return safeInternalReturnPath(stored.path);
}

export function clearAuthReturnPath() {
  sessionStorage.removeItem(STORAGE_KEY);
}
