import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCTION_API, STAGING_API, validateBuildEnvironment } from "./build-environment.mjs";

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
