import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { recordTurnstileError } from "@/lib/turnstileDiagnostics";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const TURNSTILE_SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;
export const TURNSTILE_ERROR_MESSAGE = "Security check could not complete. Please try again.";
/** If the widget neither yields a token nor reports an error within this time, treat it as failed (never "Verifying..." forever). */
export const TURNSTILE_WATCHDOG_MS = 30_000;

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null; // allow a retry
        reject(new Error("Turnstile failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface TurnstileHandle {
  reset: () => void;
}

interface Props {
  /** Called with a fresh token, or null when it expires / errors / is reset. */
  onToken: (token: string | null) => void;
  className?: string;
}

/**
 * Cloudflare Turnstile challenge. The site key is public (VITE_TURNSTILE_SITE_KEY); the secret key
 * lives only on the backend. Tokens are single-use, so call reset() after any failed submission.
 *
 * Failure handling: Cloudflare's own automatic retries are turned off (retry: "never", manual refresh). Any client error
 * (e.g. 300010), challenge timeout, script-load failure or a 30s silent stall shows one clear message and a
 * "Try again" button. Retrying is always user-initiated, so there is no retry loop.
 * Renders nothing when no site key is configured (local development with the backend dev bypass).
 */
const TurnstileWidget = forwardRef<TurnstileHandle, Props>(({ onToken, className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [failed, setFailed] = useState(false);

  const clearWatchdog = () => { if (watchdog.current) { clearTimeout(watchdog.current); watchdog.current = undefined; } };
  const fail = useCallback((code: unknown) => {
    clearWatchdog();
    recordTurnstileError(code);
    onTokenRef.current(null);
    if (mounted.current) setFailed(true);
  }, []);
  const armWatchdog = useCallback(() => {
    clearWatchdog();
    watchdog.current = setTimeout(() => fail("client_timeout"), TURNSTILE_WATCHDOG_MS);
  }, [fail]);

  /** Render the widget, or reset it if it already exists. Used for first mount, retry and post-failure reset. */
  const start = useCallback(() => {
    if (!TURNSTILE_SITE_KEY) return;
    onTokenRef.current(null);
    setFailed(false);
    armWatchdog();
    loadScript()
      .then(() => {
        if (!mounted.current || !window.turnstile) return;
        if (widgetId.current !== undefined) { window.turnstile.reset(widgetId.current); return; }
        if (!containerRef.current) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          retry: "never", // no automatic retry loop
          "refresh-expired": "manual",
          "refresh-timeout": "manual",
          callback: (token: string) => { clearWatchdog(); if (mounted.current) setFailed(false); onTokenRef.current(token); },
          "expired-callback": () => { clearWatchdog(); onTokenRef.current(null); },
          "before-interactive-callback": () => clearWatchdog(), // a human step is showing; Cloudflare's own timeout-callback covers it
          "timeout-callback": () => fail("challenge_timeout"),
          "unsupported-callback": () => fail("unsupported"),
          "error-callback": (code: unknown) => { fail(code); return true; }, // true = handled, suppress Cloudflare's console error
        });
      })
      .catch(() => fail("script_load_failed"));
  }, [armWatchdog, fail]);

  useImperativeHandle(ref, () => ({ reset: start }), [start]);

  useEffect(() => {
    mounted.current = true;
    start();
    return () => {
      mounted.current = false;
      clearWatchdog();
      if (window.turnstile && widgetId.current !== undefined) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [start]);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-2">
        <div ref={containerRef} data-testid="turnstile-widget" />
        {failed && (
          <div role="alert" className="text-center text-sm text-destructive" data-testid="turnstile-error">
            <p>{TURNSTILE_ERROR_MESSAGE}</p>
            <button type="button" onClick={start} className="mt-1 underline underline-offset-2 hover:no-underline" data-testid="turnstile-retry">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
