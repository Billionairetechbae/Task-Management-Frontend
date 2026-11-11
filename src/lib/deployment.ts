// Deployment-aware values that must never silently fall back to PRODUCTION when the app is built for staging.
// `__BUILD_TARGET__` is injected at build time from VITE_DEPLOYMENT_ENV (see scripts/build-environment.mjs).

export type DeploymentTarget = "local" | "staging" | "production";

export const DEPLOYMENT_TARGET: DeploymentTarget = typeof __BUILD_TARGET__ !== "undefined" ? __BUILD_TARGET__ : "local";

// Folded at build time: a staging bundle does not even contain the production admin host.
const PRODUCTION_ADMIN_PORTAL = DEPLOYMENT_TARGET === "staging" ? "" : "https://admin.admiino.com";

/**
 * Where the "Admin Portal" menu item points. An explicit VITE_ADMIN_URL always wins. Without it, production and local keep the existing
 * default, but a STAGING build returns null (the item is hidden) instead of sending testers to the production admin portal.
 */
export function adminPortalUrl(configured: string | undefined = import.meta.env.VITE_ADMIN_URL, target: DeploymentTarget = DEPLOYMENT_TARGET): string | null {
  const value = configured?.trim();
  if (value) return value.replace(/\/+$/, "");
  return target === "staging" ? null : PRODUCTION_ADMIN_PORTAL;
}

/**
 * Sentry environment tag. A Vercel staging build runs in Vite's "production" mode, so without this a staging error would be tagged
 * "production". An explicit VITE_SENTRY_ENVIRONMENT always wins; otherwise a staging build is tagged "staging"; everything else keeps the Vite mode.
 */
export function sentryEnvironment(configured: string | undefined, mode: string, target: DeploymentTarget = DEPLOYMENT_TARGET): string {
  return configured?.trim() || (target === "staging" ? "staging" : mode);
}
