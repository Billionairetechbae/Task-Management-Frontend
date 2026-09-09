import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("WhatsApp Phase 3A", () => {
  const page = read("pages/WhatsAppConnect.tsx");
  const api = read("lib/api.ts");
  const app = read("App.tsx");
  const integrations = read("pages/Integrations.tsx");
  const login = read("pages/Login.tsx");
  const journey = read("lib/whatsappConnectJourney.ts");

  it("registers the opaque-token connect route", () => {
    expect(app).toContain('/whatsapp/connect');
    expect(page).toContain('query.get("t")');
    expect(page).not.toContain("waId");
    expect(page).not.toContain("userId");
  });

  it("validates and revalidates challenges around authentication", () => {
    expect(page).toContain("validateWhatsAppChallenge");
    expect(page).toContain("expired or is no longer available");
    expect(page).toContain("challengeValid");
  });

  it("reuses AuthContext login and existing signup", () => {
    expect(page).toContain("useAuth");
    expect(page).not.toContain("api.login");
    expect(page).toContain("api.signupUser");
  });

  it("preserves and consumes only an opaque challenge through login", () => {
    expect(page).toContain("preserveWhatsAppConnectChallenge");
    expect(login).toContain("consumeWhatsAppConnectReturn");
    expect(journey).toContain("sessionStorage");
    expect(journey).toContain("removeItem");
    expect(journey).not.toContain("auth_token");
  });

  it("requires explicit confirmation and supports cancellation", () => {
    expect(page).toContain("Connect WhatsApp to Admiino?");
    expect(page).toContain("completeWhatsAppConnection(token, true)");
    expect(page).toContain("cancelWhatsAppConnection");
    expect(page).toContain("Connect account");
  });

  it("does not put an access JWT or password in the return URL", () => {
    expect(journey).not.toContain("auth_token");
    expect(journey).not.toContain("password");
    expect(login).toContain('continue") === "whatsapp-connect"');
  });

  it("waits for AuthContext restoration before choosing a view", () => {
    expect(page).toContain("authLoading");
    expect(page).toContain("if (!challengeValid || authLoading) return");
  });

  it("handles stale sessions safely", () => {
    expect(page).toContain("Your session has expired. Please sign in again.");
    expect(page).toContain("logout()");
  });

  it("shows safe masked account details", () => {
    expect(page).toContain("WhatsApp: ••••");
    expect(page).toContain('replace(/^(.{2}).*(@.*)$/');
  });

  it("supports disconnect and mobile layout", () => {
    expect(integrations).toContain("disconnectWhatsApp");
    expect(api).toContain("/integrations/whatsapp/account");
    expect(page).toContain("max-w-md");
    expect(page).toContain("min-h-screen");
  });
});
