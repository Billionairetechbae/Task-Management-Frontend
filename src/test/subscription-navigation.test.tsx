import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const auth = vi.hoisted(() => ({ user: { id: "u1", firstName: "Maya", lastName: "Okafor", email: "m@x.test", globalRole: "user" }, workspaceRole: "owner" as string, activeWorkspace: { name: "Studio" }, activeCompanyId: "w1", logout: vi.fn() }));
const commercial = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/api", () => ({ api: { getWorkspaceCommercial: commercial.get, getWorkspaceSeatImpact: vi.fn() } }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/notifications/WorkspaceNotificationDelivery", () => ({ WorkspaceNotificationDelivery: () => null, canManageWorkspaceNotificationDeliveries: () => false }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn(), resolved: "light" }) }));

import AccountMenu from "@/components/dashboard/AccountMenu";
import Settings from "@/pages/Settings";
import WorkspaceSubscription from "@/pages/WorkspaceSubscription";
import { SUBSCRIPTION_PATH, canViewSubscription } from "@/lib/workspaceNavigation";

afterEach(() => { cleanup(); vi.clearAllMocks(); auth.workspaceRole = "owner"; auth.activeCompanyId = "w1"; });
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const openMenu = () => fireEvent.pointerDown(screen.getByRole("button", { name: "Open account menu" }), { button: 0, ctrlKey: false });
const menu = () => render(<MemoryRouter><AccountMenu /></MemoryRouter>);

describe("Subscription & Seats navigation", () => {
  it("the canonical route is relative (no hard-coded host)", () => {
    expect(SUBSCRIPTION_PATH).toBe("/settings/workspace/subscription"); expect(SUBSCRIPTION_PATH).not.toMatch(/^https?:/);
  });

  it.each(["owner", "admin"])("profile dropdown links %s to the page, next to Workspace Settings", async (role) => {
    auth.workspaceRole = role; menu(); openMenu();
    const link = await screen.findByRole("menuitem", { name: /Subscription & Seats/ });
    expect(link).toHaveAttribute("href", SUBSCRIPTION_PATH);
    const items = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(items.indexOf("Subscription & Seats")).toBe(items.indexOf("Workspace Settings") + 1);
    expect(items.filter((t) => t === "Subscription & Seats")).toHaveLength(1);
  });

  it.each(["manager", "member", "guest", "external_viewer"])("profile dropdown hides it from %s", async (role) => {
    auth.workspaceRole = role; menu(); openMenu(); await screen.findByRole("menu");
    expect(screen.queryByRole("menuitem", { name: /Subscription/ })).not.toBeInTheDocument();
  });

  it("the entry follows the active workspace role when the user switches workspaces", async () => {
    const { rerender } = menu(); openMenu(); expect(await screen.findByRole("menuitem", { name: /Subscription & Seats/ })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    auth.workspaceRole = "member"; auth.activeCompanyId = "w2"; rerender(<MemoryRouter><AccountMenu /></MemoryRouter>);
    openMenu(); await screen.findByRole("menu"); expect(screen.queryByRole("menuitem", { name: /Subscription/ })).not.toBeInTheDocument();
  });

  it("Settings (Account tab) has exactly one entry for owners/admins and none for members", () => {
    const view = () => render(<MemoryRouter initialEntries={["/settings?tab=account"]}><Settings /></MemoryRouter>);
    view(); const link = screen.getByRole("link", { name: /View Subscription & Seats/ });
    expect(link).toHaveAttribute("href", SUBSCRIPTION_PATH); expect(screen.getAllByRole("link", { name: /Subscription/ })).toHaveLength(1);
    cleanup(); auth.workspaceRole = "member"; view(); expect(screen.queryByRole("link", { name: /Subscription/ })).not.toBeInTheDocument();
  });

  it("a direct URL (deep link / refresh) renders the existing page and calls the existing API", async () => {
    commercial.get.mockResolvedValue({ data: { plan: { code: "standard", name: "Standard" }, commercialStatus: "active", currency: "USD", usage: { activeSeats: 4, includedSeats: 3, additionalSeats: 1, unitPriceCents: 500, fixedMonthlyCents: 0, estimatedMonthlyCents: 500, contractedMaxSeats: null }, customTerms: false, billingPeriod: { start: "2026-10-01", end: "2026-10-31" }, outstandingCents: 0, paymentStatus: "none", estimateNote: "Estimate.", billingRecords: [], contactEmail: null } });
    render(<QueryClientProvider client={qc()}><MemoryRouter initialEntries={[SUBSCRIPTION_PATH]}><Routes><Route path={SUBSCRIPTION_PATH} element={<WorkspaceSubscription />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("Standard plan")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Seat usage")).getByText("Estimated monthly charge")).toBeInTheDocument(); expect(commercial.get).toHaveBeenCalledTimes(1);
  });

  it("a member who opens the URL gets no commercial data and makes no request", () => {
    auth.workspaceRole = "member";
    render(<QueryClientProvider client={qc()}><WorkspaceSubscription /></QueryClientProvider>);
    expect(screen.getByText(/owner or admin access is required/i)).toBeInTheDocument(); expect(commercial.get).not.toHaveBeenCalled();
  });

  it("an unavailable commercial service shows a helpful message, other failures keep the generic one", async () => {
    commercial.get.mockRejectedValue(Object.assign(new Error("nope"), { statusCode: 503 }));
    const { unmount } = render(<QueryClientProvider client={qc()}><WorkspaceSubscription /></QueryClientProvider>);
    expect(await screen.findByText(/not available for this workspace right now/i)).toBeInTheDocument(); unmount();
    commercial.get.mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 500 }));
    render(<QueryClientProvider client={qc()}><WorkspaceSubscription /></QueryClientProvider>);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
  });

  it("only owners and admins may view subscription data", () => {
    expect(["owner", "admin", "manager", "member", "guest", null].map((r) => canViewSubscription(r))).toEqual([true, true, false, false, false, false]);
  });
});
