export const PRODUCTION_API = "https://admiino-backend.onrender.com/api/v1";
export const STAGING_API = "https://admiino-backend-staging.onrender.com/api/v1";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEPLOYMENT_TARGETS = new Set(["local", "staging", "production"]);

function normalizeApiUrl(raw, name) {
  let api;
  try { api = new URL(raw); } catch { throw new Error(`${name} must be an absolute URL.`); }
  const path = api.pathname.replace(/\/$/, "");
  if (api.username || api.password || api.search || api.hash) {
    throw new Error(`${name} must not contain credentials, a query, or a fragment.`);
  }
  if (!path.endsWith("/api/v1")) throw new Error(`${name} must end with /api/v1.`);
  return `${api.origin}${path}`;
}

function normalizeMcpUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("VITE_MCP_SERVER_URL must be an absolute URL."); }
  const path = url.pathname.replace(/\/+$/, "");
  if (url.username || url.password || url.search || url.hash || (path && path !== "/mcp")) {
    throw new Error("VITE_MCP_SERVER_URL must be an origin or end with /mcp, without credentials, a query, or a fragment.");
  }
  return `${url.origin}/mcp`;
}

export function validateBuildEnvironment(env) {
  const vercelEnvironment = String(env.VERCEL_ENV || "").trim();
  const configuredTarget = String(env.VITE_DEPLOYMENT_ENV || "").trim().toLowerCase();
  if (env.VERCEL && !vercelEnvironment) throw new Error("VERCEL_ENV is required for a Vercel build.");
  if (env.VERCEL && !configuredTarget) throw new Error("VITE_DEPLOYMENT_ENV is required for a Vercel build.");
  const target = configuredTarget || "local";
  if (!DEPLOYMENT_TARGETS.has(target)) throw new Error(`Unsupported deployment environment: ${target}`);
  if (vercelEnvironment && !new Set(["preview", "production"]).has(vercelEnvironment)) {
    throw new Error(`Unsupported VERCEL_ENV: ${vercelEnvironment}`);
  }
  if (vercelEnvironment && target === "local") {
    throw new Error("A Vercel build must declare staging or production, not local.");
  }
  if (vercelEnvironment === "preview" && target === "production") {
    throw new Error("A Vercel preview build cannot use the production deployment environment.");
  }
  const raw = String(env.VITE_API_BASE_URL || "").trim();
  if (!raw) throw new Error(`VITE_API_BASE_URL is required for ${target} builds.`);
  const normalized = normalizeApiUrl(raw, "VITE_API_BASE_URL");
  const expectedApi = target === "production" ? PRODUCTION_API : target === "staging" ? STAGING_API : null;
  if (target === "local" && !LOOPBACK_HOSTS.has(new URL(normalized).hostname)) {
    throw new Error("Local builds may only use an explicitly configured loopback API.");
  }
  if (expectedApi && normalized !== expectedApi) {
    throw new Error(`${target === "production" ? "Production" : "Staging"} builds must use ${expectedApi}.`);
  }
  if (expectedApi && new URL(normalized).protocol !== "https:") {
    throw new Error(`${target} builds require an HTTPS API.`);
  }

  const configuredMcp = String(env.VITE_MCP_SERVER_URL || "").trim();
  const mcp = configuredMcp ? normalizeMcpUrl(configuredMcp) : `${new URL(normalized).origin}/mcp`;
  if (target !== "local" && new URL(mcp).origin !== new URL(expectedApi).origin) {
    throw new Error(`${target === "production" ? "Production" : "Staging"} MCP must use the matching backend.`);
  }
  if (target === "local" && !LOOPBACK_HOSTS.has(new URL(mcp).hostname)) {
    throw new Error("Local MCP must use an explicitly configured loopback API.");
  }
  return { target, api: normalized, mcp };
}
