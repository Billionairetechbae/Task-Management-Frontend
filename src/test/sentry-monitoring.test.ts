import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setExtra: vi.fn() })),
}));

vi.mock("@sentry/react", () => sentry);

import { ApiError, NetworkError } from "@/lib/api";
import { captureUnexpectedApiError } from "@/lib/sentry";
import AppErrorBoundary from "@/components/AppErrorBoundary";

describe("Sentry monitoring privacy and filtering", () => {
  beforeEach(() => vi.clearAllMocks());
  it("captures unexpected 5xx and network API failures", () => {
    captureUnexpectedApiError(new ApiError("server failed", 500), { path: "/projects?token=secret", method: "GET", status: 500 });
    captureUnexpectedApiError(new NetworkError("offline"), { path: "/projects", method: "GET" });
    expect(sentry.captureException).toHaveBeenCalledTimes(2);
  });

  it("does not report expected validation, authentication, permission, or not-found responses", () => {
    for (const status of [400, 401, 403, 404]) captureUnexpectedApiError(new ApiError("expected", status), { path: "/projects", method: "GET", status });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports unexpected React render failures through the safe boundary", () => {
    const boundary = new AppErrorBoundary({ children: null });
    boundary.componentDidCatch(new Error("render failed"), { componentStack: "<SensitiveComponent />" });
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
