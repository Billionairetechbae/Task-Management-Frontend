import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The widget reads the site key at import time and keeps a module-level script loader, so each test imports a fresh copy.
const turnstile = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
let opts: Record<string, any>;
let warn: ReturnType<typeof vi.spyOn>;

async function mount(onToken = vi.fn(), ref?: { current: any }) {
  vi.resetModules();
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-123");
  const mod = await import("../components/TurnstileWidget");
  const Widget = mod.default;
  const view = render(<Widget ref={ref as any} onToken={onToken} />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); }); // let loadScript().then(render) run
  return { mod, onToken, view };
}
const diagnostics = () => warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("TURNSTILE_CLIENT_ERROR")).map((l) => JSON.parse(l));

beforeEach(() => {
  turnstile.render.mockReset().mockImplementation((_el: HTMLElement, o: any) => { opts = o; return "w1"; });
  turnstile.reset.mockReset(); turnstile.remove.mockReset();
  (window as any).turnstile = turnstile;
  window.history.pushState({}, "", "/signup-executive?invite=SECRET#frag");
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); warn.mockRestore(); delete (window as any).turnstile; document.head.querySelectorAll("script").forEach((s) => s.remove()); });

describe("TurnstileWidget error handling", () => {
  it("renders with Cloudflare's automatic retry and auto-refresh disabled", async () => {
    await mount();
    expect(turnstile.render).toHaveBeenCalledTimes(1);
    expect(opts.retry).toBe("never");
    expect(opts["refresh-expired"]).toBe("manual");
    expect(opts["refresh-timeout"]).toBe("manual");
  });

  it("client error 300010 shows the clear message + retry button, clears the token, and records only code/route/timestamp", async () => {
    const { onToken } = await mount();
    act(() => opts.callback("TOKEN-VALUE-SHOULD-NEVER-BE-LOGGED"));
    expect(onToken).toHaveBeenLastCalledWith("TOKEN-VALUE-SHOULD-NEVER-BE-LOGGED");
    let handled: unknown;
    act(() => { handled = opts["error-callback"]("300010"); });
    expect(handled).toBe(true);
    expect(screen.getByTestId("turnstile-error")).toHaveTextContent("Security check could not complete. Please try again.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(onToken).toHaveBeenLastCalledWith(null);
    const [entry] = diagnostics();
    expect(Object.keys(entry).sort()).toEqual(["code", "event", "route", "timestamp"]);
    expect(entry).toMatchObject({ event: "TURNSTILE_CLIENT_ERROR", code: "300010", route: "/signup-executive" });
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
    const everything = warn.mock.calls.map((c) => String(c[0])).join("\n");
    for (const secret of ["TOKEN-VALUE-SHOULD-NEVER-BE-LOGGED", "SECRET", "frag", "site-key-123"]) expect(everything).not.toContain(secret);
  });

  it("'Try again' resets the widget once, hides the error, and a new token flows through", async () => {
    const { onToken } = await mount();
    act(() => opts["error-callback"]("300010"));
    fireEvent.click(screen.getByTestId("turnstile-retry"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(turnstile.reset).toHaveBeenCalledTimes(1);
    expect(turnstile.reset).toHaveBeenCalledWith("w1");
    expect(turnstile.render).toHaveBeenCalledTimes(1); // same widget, not a second one
    expect(screen.queryByTestId("turnstile-error")).toBeNull();
    act(() => opts.callback("fresh-token"));
    expect(onToken).toHaveBeenLastCalledWith("fresh-token");
    expect(screen.queryByTestId("turnstile-error")).toBeNull();
  });

  it("never retries by itself: after an error nothing resets or re-renders no matter how long we wait", async () => {
    await mount();
    act(() => opts["error-callback"]("300010"));
    act(() => { vi.advanceTimersByTime(10 * 60 * 1000); });
    expect(turnstile.reset).not.toHaveBeenCalled();
    expect(turnstile.render).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("turnstile-error")).toBeInTheDocument();
    expect(diagnostics()).toHaveLength(1); // the watchdog does not pile extra errors on top
  });

  it("a widget that never answers is not left on 'Verifying...': after 30s it fails once with a retry option", async () => {
    const { mod } = await mount();
    act(() => { vi.advanceTimersByTime(mod.TURNSTILE_WATCHDOG_MS - 1); });
    expect(screen.queryByTestId("turnstile-error")).toBeNull();
    act(() => { vi.advanceTimersByTime(2); });
    expect(screen.getByTestId("turnstile-error")).toBeInTheDocument();
    expect(diagnostics().map((d) => d.code)).toEqual(["client_timeout"]);
    act(() => { vi.advanceTimersByTime(5 * 60 * 1000); });
    expect(diagnostics()).toHaveLength(1);
    expect(turnstile.reset).not.toHaveBeenCalled();
  });

  it("a token cancels the watchdog; an interactive challenge pauses it (no false failure while the user solves it)", async () => {
    const { mod } = await mount();
    act(() => opts.callback("tok"));
    act(() => { vi.advanceTimersByTime(mod.TURNSTILE_WATCHDOG_MS * 3); });
    expect(screen.queryByTestId("turnstile-error")).toBeNull();
    fireEvent.click(document.body); // no-op, keeps act environment honest
    const second = await mount();
    act(() => opts["before-interactive-callback"]());
    act(() => { vi.advanceTimersByTime(second.mod.TURNSTILE_WATCHDOG_MS * 3); });
    expect(screen.queryByTestId("turnstile-error")).toBeNull();
    expect(diagnostics()).toHaveLength(0);
  });

  it("challenge timeout and unsupported browsers use the same message and are recorded by code", async () => {
    await mount();
    act(() => opts["timeout-callback"]());
    expect(screen.getByTestId("turnstile-error")).toBeInTheDocument();
    act(() => opts["unsupported-callback"]());
    expect(diagnostics().map((d) => d.code)).toEqual(["challenge_timeout", "unsupported"]);
  });

  it("a script that fails to load shows the error, and 'Try again' loads it again (user-initiated only)", async () => {
    delete (window as any).turnstile;
    // Intercept <script> insertion so jsdom does not fire its own load/error events; the test drives them.
    const created: HTMLScriptElement[] = [];
    const append = vi.spyOn(document.head, "appendChild").mockImplementation(((node: any) => { created.push(node); return node; }) as any);
    try {
      vi.resetModules(); vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-123");
      const { default: Widget } = await import("../components/TurnstileWidget");
      const onToken = vi.fn();
      render(<Widget onToken={onToken} />);
      expect(created).toHaveLength(1);
      await act(async () => { created[0].onerror?.(new Event("error")); await Promise.resolve(); await Promise.resolve(); });
      expect(screen.getByTestId("turnstile-error")).toBeInTheDocument();
      expect(diagnostics().map((d) => d.code)).toEqual(["script_load_failed"]);
      act(() => { vi.advanceTimersByTime(10 * 60 * 1000); });
      expect(created).toHaveLength(1); // no automatic second attempt
      fireEvent.click(screen.getByTestId("turnstile-retry"));
      expect(created).toHaveLength(2);
      (window as any).turnstile = turnstile;
      await act(async () => { created[1].onload?.(new Event("load")); await Promise.resolve(); await Promise.resolve(); });
      expect(turnstile.render).toHaveBeenCalledTimes(1);
      act(() => opts.callback("recovered"));
      expect(onToken).toHaveBeenLastCalledWith("recovered");
      expect(screen.queryByTestId("turnstile-error")).toBeNull();
    } finally { append.mockRestore(); }
  });

  it("the imperative reset() used after a failed signup re-arms the widget and clears an old error", async () => {
    const ref: { current: any } = { current: null };
    const { onToken } = await mount(vi.fn(), ref);
    act(() => opts["error-callback"]("300010"));
    await act(async () => { ref.current.reset(); await Promise.resolve(); await Promise.resolve(); });
    expect(turnstile.reset).toHaveBeenCalledWith("w1");
    expect(onToken).toHaveBeenLastCalledWith(null);
    expect(screen.queryByTestId("turnstile-error")).toBeNull();
  });

  it("renders nothing without a site key (local development)", async () => {
    vi.resetModules(); vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    const { default: Widget } = await import("../components/TurnstileWidget");
    const { container } = render(<Widget onToken={vi.fn()} />);
    expect(container).toBeEmptyDOMElement(); expect(turnstile.render).not.toHaveBeenCalled();
  });
});

describe("turnstile diagnostics sanitising", () => {
  it("keeps only short code-shaped values", async () => {
    const { sanitizeTurnstileCode, recordTurnstileError } = await import("../lib/turnstileDiagnostics");
    expect(sanitizeTurnstileCode("300010")).toBe("300010");
    expect(sanitizeTurnstileCode(110200)).toBe("110200");
    expect(sanitizeTurnstileCode("client_timeout")).toBe("client_timeout");
    for (const bad of ["0.AbCdEf_this_looks_like_a_token_value_that_is_far_too_long", "has space", "a=b", { code: 1 }, undefined, null, ""]) expect(sanitizeTurnstileCode(bad)).toBe("unknown");
    expect(recordTurnstileError("0.AbCdEf_this_looks_like_a_token_value_that_is_far_too_long").code).toBe("unknown");
  });
});
