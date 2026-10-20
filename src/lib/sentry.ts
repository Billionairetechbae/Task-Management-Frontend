import * as Sentry from "@sentry/react";

const enabled = Boolean(import.meta.env.VITE_SENTRY_DSN) && import.meta.env.MODE !== "test";

export function initializeSentry() {
  if (!enabled) return;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.query_string;
        delete event.request.cookies;
        if (event.request.headers) {
          for (const key of Object.keys(event.request.headers)) {
            if (/authorization|cookie|token|secret|api.key/i.test(key)) delete event.request.headers[key];
          }
        }
      }
      if (event.user) delete event.user.email;
      return event;
    },
  });
}

// One backend/database interruption surfaces as many parallel failed requests. Report it as ONE issue: a fixed fingerprint
// and at most one event per window (repeat count attached). Other 5xx/network errors keep their normal, un-throttled reporting.
const OUTAGE_WINDOW_MS = 30000;
const outage = { lastSentAt: 0, suppressed: 0 };
export function outageCaptureDecision(now = Date.now()): { suppressed: number } | null {
  if (now - outage.lastSentAt < OUTAGE_WINDOW_MS) { outage.suppressed += 1; return null; }
  const suppressed = outage.suppressed; outage.lastSentAt = now; outage.suppressed = 0;
  return { suppressed };
}
export function resetOutageThrottle() { outage.lastSentAt = 0; outage.suppressed = 0; }

export function captureUnexpectedApiError(error: unknown, metadata: { path: string; method: string; status?: number } ) {
  const candidate = error as { name?: string; statusCode?: number; body?: { code?: string } };
  const isApiError = candidate?.name === "ApiError";
  const isNetworkError = candidate?.name === "NetworkError";
  const status = isApiError ? candidate.statusCode : metadata.status;
  if (isApiError && status && status < 500) return;
  if (!isApiError && !isNetworkError) return;
  const serviceUnavailable = isNetworkError || (isApiError && (status === 503 || candidate.body?.code === "DATABASE_UNAVAILABLE"));
  let suppressed = 0;
  if (serviceUnavailable) {
    const decision = outageCaptureDecision();
    if (!decision) return;
    suppressed = decision.suppressed;
  }
  Sentry.withScope((scope) => {
    scope.setTag("feature", "api_client");
    scope.setTag("http.method", metadata.method);
    scope.setTag("http.route", metadata.path.split("?")[0]);
    if (status) scope.setTag("http.status_code", String(status));
    scope.setTag("error.category", serviceUnavailable ? "service_unavailable" : isNetworkError ? "network_failure" : "http_5xx");
    if (serviceUnavailable) { scope.setFingerprint(["service_unavailable"]); scope.setContext("safe_context", { suppressed_since_last_report: suppressed }); }
    Sentry.captureException(error);
  });
}

export function captureProjectDetailInconsistency(metadata: { projectId: string; workspaceId: string | null; route: string; requestId?: string | null }) {
  Sentry.withScope((scope) => {
    scope.setTag("event", "PROJECT_DETAIL_INCONSISTENCY");
    scope.setTag("operation", "project_detail_load");
    scope.setTag("project_id", metadata.projectId);
    scope.setTag("workspace_id", metadata.workspaceId || "none");
    scope.setTag("route", metadata.route);
    if (metadata.requestId) scope.setTag("request_id", metadata.requestId);
    Sentry.captureException(new Error("Project returned by the current list could not be loaded"));
  });
}

export { Sentry };
