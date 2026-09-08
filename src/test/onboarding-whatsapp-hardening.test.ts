import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("membership onboarding and WhatsApp connect hardening", () => {
  it("uses the existing company code join flow", () => {
    const page = read("src/pages/WorkspaceOnboarding.tsx");
    expect(page).toContain("Company Code");
    expect(page).toContain("resolveWorkspaceCode");
    expect(page).toContain("requestWorkspaceJoin");
    expect(page).not.toContain("Token or Link");
  });

  it("routes existing invitees through login", () => {
    const page = read("src/pages/Invite.tsx");
    expect(page).toContain("inspectWorkspaceInvite");
    expect(page).toContain("existingAccount");
    expect(page).toContain("pending_workspace_invite");
    expect(page).not.toContain("tryDecodeEmailFromToken");
  });

  it("opens WhatsApp without putting JWT in a URL", () => {
    const integrations = read("src/pages/Integrations.tsx");
    const api = read("src/lib/api.ts");
    expect(integrations).toContain("buildWhatsAppClickToChatUrl");
    expect(api).toContain("https://wa.me/6589932607");
    expect(api).not.toContain("?token=${encodeURIComponent(token)}");
  });

  it("maps stale identity sessions to safe copy", () => {
    const api = read("src/lib/api.ts");
    expect(api).toContain("Your session has expired. Please sign in again.");
  });
});
