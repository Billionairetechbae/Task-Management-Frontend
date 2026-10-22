// Organization invitation helpers (employee activation, existing-user acceptance, owner claim).
// The activation secret arrives in the URL FRAGMENT (never sent to a server or logged). It is read once, removed from the address bar,
// and kept only in memory. For an existing account that must sign in first, it is parked in sessionStorage (this tab only,
// 30 minutes) and removed as soon as it is used or the flow ends.

export const PENDING_KEY = "pending_org_invitation";
const PENDING_MAX_AGE_MS = 30 * 60 * 1000;
export const SECRET_PATTERN = /^[a-f0-9]{64}$/;

export interface OrgInvitationInfo {
  purpose: "employee_activation" | "existing_user_join" | "owner_claim";
  ownership: boolean;
  organizationName: string;
  workspaceRole: string;
  unitNames: string[];
  email: string;
  firstName: string | null;
  lastName: string | null;
  existingAccount: boolean;
  recoveryRequired: boolean;
  expiresAt: string | null;
}

/** Reads `#token=` once and removes it from the address bar. Falls back to a parked secret for the post-sign-in return. */
export function takeInvitationToken(): string {
  let token = "";
  try {
    token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || "";
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  } catch { token = ""; }
  if (SECRET_PATTERN.test(token)) return token;
  return takePendingInvitation() || "";
}

export function savePendingInvitation(token: string) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ token, createdAt: Date.now() })); } catch { /* private mode: the user can reopen the email link */ }
}
export function peekPendingInvitation(): boolean {
  try { return !!sessionStorage.getItem(PENDING_KEY); } catch { return false; }
}
export function takePendingInvitation(): string | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null") as { token?: unknown; createdAt?: unknown } | null;
    sessionStorage.removeItem(PENDING_KEY);
    if (!stored || typeof stored.token !== "string" || typeof stored.createdAt !== "number" || Date.now() - stored.createdAt > PENDING_MAX_AGE_MS || !SECRET_PATTERN.test(stored.token)) return null;
    return stored.token;
  } catch { return null; }
}
export function clearPendingInvitation() { try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } }

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;

export interface PasswordCheck { length: boolean; letterAndNumber: boolean; notEmailDerived: boolean; withinMax: boolean }

/** Mirrors the server policy (8-100 characters, a letter and a number, not derived from the email). The server is authoritative. */
export function checkPassword(password: string, email: string): PasswordCheck {
  const local = email.split("@")[0].toLowerCase();
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    letterAndNumber: /[A-Za-z]/.test(password) && /\d/.test(password),
    notEmailDerived: !(local.length >= 4 && password.toLowerCase().includes(local)),
    withinMax: password.length <= MAX_PASSWORD_LENGTH,
  };
}
export const passwordProblem = (password: string, email: string): string | null => {
  const c = checkPassword(password, email);
  if (!password) return "Enter a password.";
  if (!c.length) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!c.withinMax) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  if (!c.letterAndNumber) return "Include at least one letter and one number.";
  if (!c.notEmailDerived) return "Your password must not contain your email name.";
  return null;
};

export const roleLabel = (role: string) => ({ owner: "Owner", admin: "Admin", manager: "Manager", member: "Member" } as Record<string, string>)[role] || "Member";
