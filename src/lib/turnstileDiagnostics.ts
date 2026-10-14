import { Sentry } from "@/lib/sentry";

/**
 * Client-side Turnstile failure record. Deliberately minimal: error code, route, timestamp.
 * Never include the challenge token, form values, query strings or anything from the response.
 */
export interface TurnstileClientError {
  event: "TURNSTILE_CLIENT_ERROR";
  code: string;
  route: string;
  timestamp: string;
}

/** Cloudflare client codes look like "300010" or "110200"; our own are short snake_case labels. */
export function sanitizeTurnstileCode(code: unknown): string {
  const text = typeof code === "string" || typeof code === "number" ? String(code) : "";
  return /^[A-Za-z0-9_-]{1,32}$/.test(text) ? text : "unknown";
}

export function recordTurnstileError(code: unknown): TurnstileClientError {
  const entry: TurnstileClientError = {
    event: "TURNSTILE_CLIENT_ERROR",
    code: sanitizeTurnstileCode(code),
    route: typeof window !== "undefined" ? window.location.pathname : "unknown", // pathname only: no query/hash
    timestamp: new Date().toISOString(),
  };
  try {
    console.warn(JSON.stringify(entry));
    Sentry.captureMessage(entry.event, { level: "warning", tags: { feature: "turnstile", code: entry.code, route: entry.route } });
  } catch {
    /* diagnostics must never break signup */
  }
  return entry;
}
