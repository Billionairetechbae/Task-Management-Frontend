import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ captured: [] as any[], fingerprints: [] as any[] }));
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  captureException: (error: unknown) => sentry.captured.push(error),
  withScope: (fn: (scope: any) => void) => fn({ setTag: vi.fn(), setContext: vi.fn(), setFingerprint: (f: unknown) => sentry.fingerprints.push(f) }),
}));
vi.stubEnv("VITE_SENTRY_DSN", "https://example.invalid/1");

import { shouldRetryQuery, queryRetryDelay } from "@/lib/queryClient";

const apiError = (statusCode: number, code?: string) => Object.assign(new Error("x"), { name: "ApiError", statusCode, body: code ? { code } : {} });
const networkError = () => Object.assign(new Error("Failed to fetch"), { name: "NetworkError" });

describe("query retry policy", () => {
  it("never retries answers that will not change: 400/401/403/404/423", () => {
    for (const status of [400, 401, 403, 404, 409, 423, 429]) expect(shouldRetryQuery(0, apiError(status))).toBe(false);
  });
  it("retries connectivity failures with backoff so the UI recovers by itself (network, 502/503/504), bounded", () => {
    for (const e of [networkError(), apiError(503, "DATABASE_UNAVAILABLE"), apiError(502), apiError(504)]) {
      expect(shouldRetryQuery(0, e)).toBe(true); expect(shouldRetryQuery(3, e)).toBe(true); expect(shouldRetryQuery(4, e)).toBe(false);
    }
  });
  it("a plain 500 gets a single retry; unknown errors one retry", () => {
    expect(shouldRetryQuery(0, apiError(500))).toBe(true); expect(shouldRetryQuery(1, apiError(500))).toBe(false);
    expect(shouldRetryQuery(0, new Error("boom"))).toBe(true); expect(shouldRetryQuery(1, new Error("boom"))).toBe(false);
  });
  it("backoff grows and is capped", () => {
    expect(queryRetryDelay(0)).toBeLessThan(1400); expect(queryRetryDelay(10)).toBeLessThan(8400);
  });
});

describe("frontend Sentry grouping for outages", () => {
  beforeEach(async () => { sentry.captured.length = 0; sentry.fingerprints.length = 0; (await import("@/lib/sentry")).resetOutageThrottle(); });

  it("dozens of parallel failures from one outage are reported as ONE issue per window, with a fixed fingerprint", async () => {
    const { captureUnexpectedApiError } = await import("@/lib/sentry");
    for (let i = 0; i < 40; i++) captureUnexpectedApiError(i % 2 ? networkError() : apiError(503, "DATABASE_UNAVAILABLE"), { path: `/tasks/${i}`, method: "GET", status: 503 });
    expect(sentry.captured.length).toBe(1);
    expect(sentry.fingerprints).toEqual([["service_unavailable"]]);
  });

  it("expected client errors (400/401/403/404) are never reported", async () => {
    const { captureUnexpectedApiError } = await import("@/lib/sentry");
    for (const status of [400, 401, 403, 404, 423]) captureUnexpectedApiError(apiError(status), { path: "/x", method: "GET", status });
    expect(sentry.captured.length).toBe(0);
  });

  it("genuine server errors (500) are NOT throttled or regrouped: every one is reported", async () => {
    const { captureUnexpectedApiError } = await import("@/lib/sentry");
    for (let i = 0; i < 5; i++) captureUnexpectedApiError(apiError(500), { path: `/bug/${i}`, method: "POST", status: 500 });
    expect(sentry.captured.length).toBe(5); expect(sentry.fingerprints.length).toBe(0);
  });

  it("the next window reports again and carries the suppressed count", async () => {
    const { outageCaptureDecision } = await import("@/lib/sentry");
    expect(outageCaptureDecision(100_000)).toEqual({ suppressed: 0 });
    for (let i = 0; i < 9; i++) expect(outageCaptureDecision(100_001 + i)).toBeNull();
    expect(outageCaptureDecision(130_001)).toEqual({ suppressed: 9 });
  });
});
