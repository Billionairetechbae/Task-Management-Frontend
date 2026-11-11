import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state = vi.hoisted(() => ({ adminUrl: null as string | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { firstName: "Op", lastName: "Erator", email: "op@staging.invalid", globalRole: "super_admin" }, logout: vi.fn(), workspaceRole: "owner", activeWorkspace: { name: "Studio" } }) }));
vi.mock("@/lib/deployment", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/deployment")>()), adminPortalUrl: () => state.adminUrl }));

import AccountMenu from "@/components/dashboard/AccountMenu";
const { adminPortalUrl, sentryEnvironment } = await vi.importActual<typeof import("@/lib/deployment")>("@/lib/deployment");

afterEach(() => cleanup());

describe("deployment-aware values never fall back to production in staging", () => {
  it("admin portal link: explicit URL wins, production keeps its default, staging gets none", () => {
    expect(adminPortalUrl("https://admin-staging.example.com/", "staging")).toBe("https://admin-staging.example.com");
    expect(adminPortalUrl("  https://admin-staging.example.com  ", "production")).toBe("https://admin-staging.example.com");
    expect(adminPortalUrl(undefined, "production")).toBe("https://admin.admiino.com");
    expect(adminPortalUrl("", "local")).toBe("https://admin.admiino.com");
    expect(adminPortalUrl(undefined, "staging")).toBeNull();
    expect(adminPortalUrl("   ", "staging")).toBeNull();
  });

  it("sentry environment: staging builds are tagged staging even though Vite reports production mode", () => {
    expect(sentryEnvironment(undefined, "production", "staging")).toBe("staging");
    expect(sentryEnvironment("qa", "production", "staging")).toBe("qa");
    expect(sentryEnvironment(undefined, "production", "production")).toBe("production");
    expect(sentryEnvironment(undefined, "development", "local")).toBe("development");
    expect(sentryEnvironment("  ", "production", "production")).toBe("production");
  });

  const open = () => { render(<MemoryRouter><AccountMenu /></MemoryRouter>); fireEvent.pointerDown(screen.getByRole("button", { name: "Open account menu" }), { button: 0, ctrlKey: false }); };

  it("the Admin Portal menu item points at the configured URL for platform staff", async () => {
    state.adminUrl = "https://admin-staging.example.com";
    open();
    const item = await screen.findByRole("menuitem", { name: /Admin Portal/ });
    expect(item.getAttribute("href")).toBe("https://admin-staging.example.com/admin");
  });

  it("is hidden entirely (never a production link) when a staging build has no admin URL", async () => {
    state.adminUrl = null;
    open();
    await screen.findByText("Op Erator");
    expect(screen.queryByRole("menuitem", { name: /Admin Portal/ })).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("admin.admiino.com");
  });
});
