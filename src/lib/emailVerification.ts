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

/**
 * Registrant proof. The signup response carries a secret that is NEVER emailed. Keeping it in this browser lets the person who registered
 * here confirm their email without choosing another password; anyone else holding only the emailed link (another device, or someone who
 * pre-registered an address that is not theirs) has no proof and must confirm the existing password or set a new one.
 */
const PROOF_KEY = "admiino.verificationProofs";
const PROOF_TTL_MS = 72 * 60 * 60 * 1000;
const PROOF_MAX = 5;
const PROOF_PATTERN = /^[a-f0-9]{64}$/;
type ProofStore = Record<string, { p: string; t: number }>;
const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

function readProofs(): ProofStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROOF_KEY) || "{}") as ProofStore;
    const now = Date.now(); const fresh: ProofStore = {};
    for (const [email, entry] of Object.entries(parsed || {})) if (entry && PROOF_PATTERN.test(entry.p) && now - entry.t < PROOF_TTL_MS) fresh[email] = entry;
    return fresh;
  } catch { return {}; }
}
function writeProofs(store: ProofStore) { try { localStorage.setItem(PROOF_KEY, JSON.stringify(store)); } catch { /* storage unavailable: the person falls back to confirming their password */ } }

export function rememberVerificationProof(email: string, proof: unknown) {
  if (typeof proof !== "string" || !PROOF_PATTERN.test(proof) || !normalizeEmail(email)) return;
  const store = readProofs(); store[normalizeEmail(email)] = { p: proof, t: Date.now() };
  const newest = Object.entries(store).sort((a, b) => b[1].t - a[1].t).slice(0, PROOF_MAX);
  writeProofs(Object.fromEntries(newest));
}
export function recallVerificationProof(email: string): string {
  return readProofs()[normalizeEmail(email)]?.p || "";
}
export function forgetVerificationProof(email: string) {
  const store = readProofs(); delete store[normalizeEmail(email)]; writeProofs(store);
}
