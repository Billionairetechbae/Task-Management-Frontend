import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractIntegrations, normalizeIntegration, STATUS_STYLES } from "@/lib/integrations";

describe("Integrations production crash regression", () => {
  it("normalizes a synthesized WhatsApp integration with a renderable status", () => {
    const integration = normalizeIntegration({
      id: "whatsapp",
      name: "WhatsApp",
      available: true,
      connected: true,
    });

    expect(integration.status).toBe("CONNECTED");
    expect(STATUS_STYLES[integration.status].className).toContain("emerald");
  });

  it("normalizes disconnected integrations with a renderable fallback", () => {
    const integration = normalizeIntegration({ id: "unknown", available: true });
    expect(integration.status).toBe("DISCONNECTED");
    expect(STATUS_STYLES[integration.status]).toBeDefined();
  });

  it("shows only the integrations currently supported by Admiino", () => {
    const integrations = extractIntegrations({
      data: {
        integrations: [
          { id: "google", connected: true },
          { id: "whatsapp", connected: false },
          { id: "microsoft", connected: false },
          { id: "slack", connected: false },
        ],
      },
    });

    expect(integrations.map((integration) => integration.id)).toEqual(["google", "whatsapp"]);
  });

  it("does not request the unsupported activity endpoint", () => {
    const page = readFileSync(join(process.cwd(), "src/pages/Integrations.tsx"), "utf8");
    const api = readFileSync(join(process.cwd(), "src/lib/api.ts"), "utf8");
    expect(page).not.toContain("getIntegrationActivity");
    expect(api).not.toContain("/integrations/activity");
  });

  it("does not log authenticated request headers", () => {
    const api = readFileSync(join(process.cwd(), "src/lib/api.ts"), "utf8");
    expect(api).not.toContain("API DEBUG /tasks headers");
    expect(api).not.toMatch(/console\.log\([^\n]*headers/i);
  });
});
