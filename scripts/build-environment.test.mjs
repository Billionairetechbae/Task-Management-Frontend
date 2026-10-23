import assert from "node:assert/strict";
import test from "node:test";
import { validateBuildEnvironment } from "./build-environment.mjs";

const production = "https://admiino-backend.onrender.com/api/v1";
test("local builds require an explicit loopback API", () => {
  assert.equal(validateBuildEnvironment({ VITE_API_BASE_URL: "http://localhost:5001/api/v1" }).target, "local");
  assert.throws(() => validateBuildEnvironment({}), /required/);
  assert.throws(() => validateBuildEnvironment({ VITE_API_BASE_URL: production }), /loopback/);
});
test("preview builds require staging and refuse production", () => {
  assert.equal(validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "preview", VITE_API_BASE_URL: "https://admiino-staging.onrender.com/api/v1" }).api, "https://admiino-staging.onrender.com/api/v1");
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "preview" }), /required/);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "preview", VITE_API_BASE_URL: production }), /must not use/);
});
test("production builds require the canonical production API", () => {
  assert.equal(validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_API_BASE_URL: production }).api, production);
  assert.throws(() => validateBuildEnvironment({ VERCEL: "1", VERCEL_ENV: "production", VITE_API_BASE_URL: "https://admiino-staging.onrender.com/api/v1" }), /must use/);
});
