import { afterEach, describe, expect, it } from "vitest";
import { takeVerificationToken, verificationPasswordProblem } from "./emailVerification";

const TOKEN = "a1".repeat(32);
afterEach(() => { window.history.replaceState(null, "", "/"); sessionStorage.clear(); });

describe("takeVerificationToken", () => {
  it("reads the fragment secret and strips it from the address bar", () => {
    window.history.replaceState(null, "", `/verify-email/setup#token=${TOKEN}`);
    expect(takeVerificationToken()).toBe(TOKEN);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/verify-email/setup");
  });
  it("rejects anything that is not a 64-hex secret and never reads the query string or storage", () => {
    window.history.replaceState(null, "", "/verify-email/setup#token=short");
    expect(takeVerificationToken()).toBe("");
    sessionStorage.setItem("pendingOrgInvitation", JSON.stringify({ token: TOKEN }));
    window.history.replaceState(null, "", `/verify-email/setup?token=${TOKEN}`);
    expect(takeVerificationToken()).toBe("");
  });
});

describe("verificationPasswordProblem", () => {
  it("keeps the public signup rule (6-100), not the stricter onboarding rule", () => {
    expect(verificationPasswordProblem("abc12")).not.toBeNull();
    expect(verificationPasswordProblem("abcdef")).toBeNull();
    expect(verificationPasswordProblem("x".repeat(101))).not.toBeNull();
  });
});
