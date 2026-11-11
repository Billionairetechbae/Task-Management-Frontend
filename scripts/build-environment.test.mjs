import assert from "node:assert/strict";
import test from "node:test";
import { LEGACY_PRODUCTION_API, PRODUCTION_API, STAGING_API, validateBuildEnvironment } from "./build-environment.mjs";

test("local builds preserve loopback development behavior", () => {
  assert.equal(validateBuildEnvironment({ VITE_API_BASE_URL: "http://localhost:5001/api/v1" }).target, "local");
  assert.equal(validateBuildEnvironment({ VITE_DEPLOYMENT_ENV: "local", VITE_API_BASE_URL: "http://127.0.0.1:5001/api/v1" }).target, "local");
  assert.throws(() => validateBuildEnvironment({}), /required/);
  assert.throws(() => validateBuildEnvironment({ VITE_API_BASE_URL: PRODUCTION_API }), /loopback/);
});
test("staging builds work for Vercel preview and separate-project production", () => {
  const preview = { VERCEL: "1", VERCEL_ENV: "preview", VITE_DEPLOYMENT_ENV: "staging", VITE_API_BASE_URL: STAGING_API };
  const separateProject = { VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "staging", VITE_API_BASE_URL: STAGING_API };
  assert.equal(validateBuildEnvironment(preview).target, "staging");
  assert.equal(validateBuildEnvironment(separateProject).api, STAGING_API);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "preview", VITE_API_BASE_URL: STAGING_API }), /VITE_DEPLOYMENT_ENV/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "preview", VITE_DEPLOYMENT_ENV: "staging" }), /required/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "preview", VITE_DEPLOYMENT_ENV: "production", VITE_API_BASE_URL: PRODUCTION_API }), /preview/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "local", VITE_API_BASE_URL: "http://localhost:5001/api/v1" }), /not local/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "staging", VITE_API_BASE_URL: PRODUCTION_API }), /Staging builds/);
});
test("production builds require the canonical production API", () => {
  assert.equal(validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "production", VITE_API_BASE_URL: PRODUCTION_API }).api, PRODUCTION_API);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "production", VITE_API_BASE_URL: STAGING_API }), /must use/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "production", VITE_API_BASE_URL: PRODUCTION_API, VITE_MCP_SERVER_URL: "https://admiino-backend-staging.onrender.com/mcp" }), /Production MCP/);
});
test("invalid and missing remote configuration fails closed", () => {
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "production" }), /VITE_API_BASE_URL/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "staging", VITE_API_BASE_URL: "not-a-url" }), /absolute URL/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "staging", VITE_API_BASE_URL: `${STAGING_API}?x=1` }), /query/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "staging", VITE_API_BASE_URL: STAGING_API, VITE_MCP_SERVER_URL: "https://admiino-backend.onrender.com/mcp" }), /Staging MCP/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_DEPLOYMENT_ENV: "staging", VITE_API_BASE_URL: STAGING_API, VITE_MCP_SERVER_URL: "https://example.com/other" }), /VITE_MCP_SERVER_URL/);
});

// ---- Singapore cutover: api.admiino.com is the only production API (environment matrix) ----
const matrixVercel = (target, api, extra = {}) => ({ VERCEL: "1", VERCEL_ENV: "production", ...(target ? { VITE_DEPLOYMENT_ENV: target } : {}), ...(api === undefined ? {} : { VITE_API_BASE_URL: api }), ...extra });

test("matrix: production accepts exactly https://api.admiino.com/api/v1", () => {
  assert.equal(PRODUCTION_API, "https://api.admiino.com/api/v1");
  assert.equal(validateBuildEnvironment(matrixVercel("production", "https://api.admiino.com/api/v1")).api, "https://api.admiino.com/api/v1");
  assert.equal(validateBuildEnvironment(matrixVercel("production", "https://API.Admiino.com:443/api/v1/")).api, "https://api.admiino.com/api/v1", "case, default port and trailing slash normalise to the same origin");
});

test("matrix: production rejects staging, the retired legacy API, localhost, a missing value and a missing environment", () => {
  assert.throws(() => validateBuildEnvironment(matrixVercel("production", STAGING_API)), /Production builds must use/);
  assert.throws(() => validateBuildEnvironment(matrixVercel("production", LEGACY_PRODUCTION_API)), /legacy production API is retired/);
  assert.throws(() => validateBuildEnvironment(matrixVercel("production", "http://localhost:5001/api/v1")), /Production builds must use/);
  assert.throws(() => validateBuildEnvironment(matrixVercel("production", undefined)), /VITE_API_BASE_URL is required/);
  assert.throws(() => validateBuildEnvironment(matrixVercel("production", "")), /VITE_API_BASE_URL is required/);
  assert.throws(() => validateBuildEnvironment(matrixVercel(undefined, PRODUCTION_API)), /VITE_DEPLOYMENT_ENV is required/);
  assert.throws(() => validateBuildEnvironment(matrixVercel(undefined, STAGING_API)), /VITE_DEPLOYMENT_ENV is required/);
});

test("matrix: lookalike hosts, suffix tricks and malformed URLs can never be production", () => {
  for (const bad of [
    "https://api.admiino.com.evil.test/api/v1", "https://evil-api.admiino.com/api/v1", "https://api.admiino.co/api/v1", "https://api.admiino.com@evil.test/api/v1",
    "https://user:pw@api.admiino.com/api/v1", "https://api.admiino.com/api/v1?x=1", "https://api.admiino.com/api/v1#x", "https://api.admiino.com/api/v2", "https://api.admiino.com/evil/api/v1",
    "https://api.admiino.com:8443/api/v1", "http://api.admiino.com/api/v1", "https://admiino.com/api/v1", "https://app.admiino.com/api/v1", "api.admiino.com/api/v1",
  ]) assert.throws(() => validateBuildEnvironment(matrixVercel("production", bad)), undefined, bad);
});

test("matrix: staging accepts only the staging API and never the production or legacy APIs", () => {
  assert.equal(validateBuildEnvironment(matrixVercel("staging", STAGING_API)).api, STAGING_API);
  assert.throws(() => validateBuildEnvironment(matrixVercel("staging", PRODUCTION_API)), /Staging builds must use/);
  assert.throws(() => validateBuildEnvironment(matrixVercel("staging", LEGACY_PRODUCTION_API)), /legacy production API is retired/);
  assert.throws(() => validateBuildEnvironment(matrixVercel("staging", "https://admiino-backend-staging.onrender.com.evil.test/api/v1")), /Staging builds must use/);
  assert.throws(() => validateBuildEnvironment(matrixVercel("staging", undefined)), /VITE_API_BASE_URL is required/);
});

test("matrix: Vite's default production mode is not what identifies production; only the declared environment is", () => {
  // NODE_ENV=production / a Vercel Production environment must not turn a staging declaration into a production build.
  const r = validateBuildEnvironment({ ...matrixVercel("staging", STAGING_API), NODE_ENV: "production", MODE: "production" });
  assert.equal(r.target, "staging");
  assert.throws(() => validateBuildEnvironment({ ...matrixVercel(undefined, PRODUCTION_API), NODE_ENV: "production" }), /VITE_DEPLOYMENT_ENV is required/);
});

test("matrix: a separate MCP URL cannot override the validated backend", () => {
  assert.equal(validateBuildEnvironment(matrixVercel("production", PRODUCTION_API)).mcp, "https://api.admiino.com/mcp");
  assert.equal(validateBuildEnvironment(matrixVercel("production", PRODUCTION_API, { VITE_MCP_SERVER_URL: "https://api.admiino.com/mcp" })).mcp, "https://api.admiino.com/mcp");
  for (const mcp of ["https://admiino-backend.onrender.com/mcp", "https://admiino-backend-staging.onrender.com/mcp", "https://api.admiino.com.evil.test/mcp"]) {
    assert.throws(() => validateBuildEnvironment(matrixVercel("production", PRODUCTION_API, { VITE_MCP_SERVER_URL: mcp })), /MCP must use the matching backend/, mcp);
  }
  assert.throws(() => validateBuildEnvironment(matrixVercel("staging", STAGING_API, { VITE_MCP_SERVER_URL: "https://api.admiino.com/mcp" })), /MCP must use the matching backend/);
});
