const PRODUCTION_API = "https://admiino-backend.onrender.com/api/v1";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function validateBuildEnvironment(env) {
  const vercelEnvironment = String(env.VERCEL_ENV || "").trim();
  const target = vercelEnvironment || "local";
  if (env.VERCEL && !vercelEnvironment) throw new Error("VERCEL_ENV is required for a Vercel build.");
  if (!new Set(["local", "preview", "production"]).has(target)) throw new Error(`Unsupported build environment: ${target}`);
  const raw = String(env.VITE_API_BASE_URL || "").trim();
  if (!raw) throw new Error(`VITE_API_BASE_URL is required for ${target} builds.`);
  let api;
  try { api = new URL(raw); } catch { throw new Error("VITE_API_BASE_URL must be an absolute URL."); }
  const normalized = `${api.origin}${api.pathname.replace(/\/$/, "")}`;
  if (api.username || api.password || api.search || api.hash) throw new Error("VITE_API_BASE_URL must not contain credentials, a query, or a fragment.");
  if (!api.pathname.replace(/\/$/, "").endsWith("/api/v1")) throw new Error("VITE_API_BASE_URL must end with /api/v1.");
  if (target === "local" && !LOOPBACK_HOSTS.has(api.hostname)) throw new Error("Local builds may only use an explicitly configured loopback API.");
  if (target === "preview") {
    if (api.protocol !== "https:") throw new Error("Preview builds require an HTTPS staging API.");
    if (normalized === PRODUCTION_API) throw new Error("Preview builds must not use the production API.");
  }
  if (target === "production" && normalized !== PRODUCTION_API) throw new Error(`Production builds must use ${PRODUCTION_API}.`);
  return { target, api: normalized };
}
