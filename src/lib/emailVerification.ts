const SECRET_PATTERN = /^[a-f0-9]{64}$/;
export const VERIFY_MIN_PASSWORD = 6;
export const VERIFY_MAX_PASSWORD = 100;

/** Reads the verification secret from the URL fragment and removes it from the address bar. Never falls back to storage. */
export function takeVerificationToken(): string {
  let token = "";
  try {
    token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || "";
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  } catch { token = ""; }
  return SECRET_PATTERN.test(token) ? token : "";
}

/** Mirrors the public signup rule enforced by the server (the server stays authoritative). */
export function verificationPasswordProblem(password: string): string | null {
  if (password.length < VERIFY_MIN_PASSWORD) return `Use at least ${VERIFY_MIN_PASSWORD} characters.`;
  if (password.length > VERIFY_MAX_PASSWORD) return `Use at most ${VERIFY_MAX_PASSWORD} characters.`;
  return null;
}
