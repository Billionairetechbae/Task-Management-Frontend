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

import { forgetVerificationProof, recallVerificationProof, rememberVerificationProof } from "./emailVerification";
const P = "c3".repeat(32);
describe("signup proof storage", () => {
  afterEach(() => localStorage.clear());
  it("remembers a well-formed proof per normalized email and forgets it on request", () => {
    rememberVerificationProof("  Ada@Example.COM ", P);
    expect(recallVerificationProof("ada@example.com")).toBe(P);
    forgetVerificationProof("ADA@example.com");
    expect(recallVerificationProof("ada@example.com")).toBe("");
  });
  it("ignores malformed values, expired entries and storage failures (falls back to confirming the password)", () => {
    rememberVerificationProof("a@example.com", "short"); rememberVerificationProof("a@example.com", undefined); rememberVerificationProof("", P);
    expect(recallVerificationProof("a@example.com")).toBe("");
    localStorage.setItem("admiino.verificationProofs", JSON.stringify({ "old@example.com": { p: P, t: Date.now() - 80 * 3600 * 1000 } }));
    expect(recallVerificationProof("old@example.com")).toBe("");
    localStorage.setItem("admiino.verificationProofs", "{not json");
    expect(recallVerificationProof("a@example.com")).toBe("");
  });
  it("keeps at most five proofs, newest first", () => {
    for (let i = 0; i < 7; i += 1) { rememberVerificationProof(`u${i}@example.com`, P); }
    const held = Object.keys(JSON.parse(localStorage.getItem("admiino.verificationProofs") || "{}"));
    expect(held).toHaveLength(5);
  });
});
