import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: "executive", firstName: "Ada", lastName: "Obi" }, logout: vi.fn(), workspaceRole: "owner" }),
}));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/components/integrations/IntegrationsDropdown", () => ({ default: () => null }));
vi.mock("@/components/notifications/NotificationsDropdown", () => ({ default: () => null }));
vi.mock("@/components/time/GlobalTimerIndicator", () => ({ default: () => null }));
vi.mock("@/components/WebSocketStatus", () => ({ WebSocketStatus: () => null }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
vi.mock("@/components/WorkspaceSwitcher", () => ({ default: () => null }));

import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MAINTENANCE_MAX_STALE_MS, MAINTENANCE_REFRESH_MS } from "@/hooks/useMaintenanceBanner";
import { __resetDismissMemoryForTests, DISMISS_STORAGE_KEY, type PublicMaintenance } from "@/lib/maintenanceBanner";

const announcement = (o: Partial<PublicMaintenance> = {}): PublicMaintenance => ({ id: "m1", revision: 1, status: "upcoming", title: "Planned infrastructure maintenance", message: "Some services may be temporarily unavailable.", startsAt: "2026-11-18T02:00:00.000Z", endsAt: "2026-11-18T06:00:00.000Z", timezone: "Africa/Lagos", statusPageUrl: null, completedAt: null, ...o });
const ok = (a: PublicMaintenance | null) => ({ ok: true, status: 200, json: async () => ({ status: "success", data: { announcement: a } }) }) as Response;

let fetchMock: ReturnType<typeof vi.fn>;
const clientWith = () => new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
const mount = (ui: React.ReactNode, client = clientWith()) => ({ client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) });
const banner = () => document.querySelector("[data-maintenance-banner]");

beforeEach(() => { localStorage.clear(); __resetDismissMemoryForTests(); fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("User Portal maintenance banner", () => {
  it("renders nothing when there is no announcement, and calls the public portal endpoint without credentials", async () => {
    fetchMock.mockResolvedValue(ok(null));
    mount(<MaintenanceBanner />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/system\/maintenance\/active\?surface=portal$/);
    expect(init.credentials).toBe("omit");
    expect(init.headers.Authorization).toBeUndefined();
    expect(banner()).toBeNull();
  });

  it.each([
    ["upcoming", "Upcoming maintenance"],
    ["ongoing", "Maintenance in progress"],
    ["completed", "Maintenance completed"],
  ] as const)("renders the %s state", async (status, label) => {
    fetchMock.mockResolvedValue(ok(announcement({ status })));
    mount(<MaintenanceBanner />);
    const region = await screen.findByRole("status");
    expect(region.getAttribute("data-maintenance-banner")).toBe(status);
    expect(region.textContent).toContain(label);
    expect(region.textContent).toContain("Planned infrastructure maintenance");
  });

  it("shows the schedule in the announcement's time zone, naming the zone", async () => {
    fetchMock.mockResolvedValue(ok(announcement()));
    mount(<MaintenanceBanner />);
    const region = await screen.findByRole("status");
    expect(region.textContent).toMatch(/3:00\s?AM/);
    expect(region.textContent).toMatch(/WAT|GMT\+1/);
  });

  it("dismissing an upcoming notice hides it, survives a reload, and a materially updated revision shows again", async () => {
    fetchMock.mockResolvedValue(ok(announcement()));
    const first = mount(<MaintenanceBanner />);
    await screen.findByRole("status");
    fireEvent.click(screen.getByRole("button", { name: /dismiss maintenance notice/i }));
    expect(banner()).toBeNull();
    expect(localStorage.getItem(DISMISS_STORAGE_KEY)).toBe(JSON.stringify(["m1:1"])); // keys only, no personal data
    first.unmount();
    mount(<MaintenanceBanner />); // "reload"
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(banner()).toBeNull();
    cleanup();
    fetchMock.mockResolvedValue(ok(announcement({ revision: 2, message: "The window has moved." })));
    mount(<MaintenanceBanner />);
    expect((await screen.findByRole("status")).textContent).toContain("The window has moved.");
  });

  it("completed notices can be dismissed", async () => {
    fetchMock.mockResolvedValue(ok(announcement({ status: "completed", revision: 4 })));
    mount(<MaintenanceBanner />);
    await screen.findByRole("status");
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(banner()).toBeNull();
  });

  it("ongoing maintenance has no dismiss control and cannot be hidden, even if its key was stored before", async () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(["m1:3"]));
    fetchMock.mockResolvedValue(ok(announcement({ status: "ongoing", revision: 3 })));
    mount(<MaintenanceBanner />);
    await screen.findByRole("status");
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
    expect(banner()?.getAttribute("data-maintenance-banner")).toBe("ongoing");
  });

  it("renders the status page link only when it is a safe https URL", async () => {
    fetchMock.mockResolvedValue(ok(announcement({ statusPageUrl: "https://status.admiino.com/" })));
    mount(<MaintenanceBanner />);
    const link = (await screen.findByRole("link", { name: /status page/i })) as HTMLAnchorElement;
    expect(link.href).toBe("https://status.admiino.com/");
    expect(link.rel).toContain("noopener");
    cleanup();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { announcement: { ...announcement(), statusPageUrl: "javascript:alert(1)" } } }) });
    mount(<MaintenanceBanner />);
    await screen.findByRole("status");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders announcement text as plain text, never HTML", async () => {
    fetchMock.mockResolvedValue(ok(announcement({ title: "<img src=x onerror=alert(1)>", message: "<b>bold</b>" })));
    mount(<MaintenanceBanner />);
    const region = await screen.findByRole("status");
    expect(region.querySelector("img")).toBeNull();
    expect(region.querySelector("b")).toBeNull();
    expect(region.textContent).toContain("<b>bold</b>");
  });

  it("fails silently: network errors, 5xx and malformed bodies render nothing and never throw", async () => {
    for (const impl of [() => Promise.reject(new TypeError("Failed to fetch")), () => Promise.resolve({ ok: false, status: 503, json: async () => ({}) }), () => Promise.resolve({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } }), () => Promise.resolve(ok({ id: 5 } as unknown as PublicMaintenance))]) {
      fetchMock.mockReset(); fetchMock.mockImplementation(impl);
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mount(<MaintenanceBanner />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
      expect(banner()).toBeNull();
      spy.mockRestore();
      cleanup();
    }
  });

  it("renders nothing (and does not crash) outside a QueryClientProvider", () => {
    render(<MaintenanceBanner />);
    expect(banner()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes about every 60 seconds and when the tab regains focus", async () => {
    expect(MAINTENANCE_REFRESH_MS).toBe(60_000);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue(ok(null));
    mount(<MaintenanceBanner />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    const before = fetchMock.mock.calls.length;
    fetchMock.mockResolvedValue(ok(announcement({ status: "ongoing" })));
    await act(async () => { await vi.advanceTimersByTimeAsync(25_000); focusManager.setFocused(false); focusManager.setFocused(true); });
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(before));
    expect((await screen.findByRole("status")).getAttribute("data-maintenance-banner")).toBe("ongoing");
  });

  it("a failed refresh keeps the last answer only for a bounded time", async () => {
    expect(MAINTENANCE_MAX_STALE_MS).toBe(5 * 60_000);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValueOnce(ok(announcement({ status: "ongoing" })));
    fetchMock.mockRejectedValue(new TypeError("offline"));
    mount(<MaintenanceBanner />);
    await screen.findByRole("status");
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60_000); });
    expect(banner()).not.toBeNull(); // within the bound the last good answer still shows
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    await waitFor(() => expect(banner()).toBeNull()); // beyond it, stale data is not presented as current
  });
});

describe("DashboardLayout integration", () => {
  const renderLayout = () => mount(<MemoryRouter initialEntries={["/tasks"]}><DashboardLayout><div data-testid="page">page</div></DashboardLayout></MemoryRouter>);

  it("mounts exactly one banner above the sticky page header and before the page content", async () => {
    fetchMock.mockResolvedValue(ok(announcement({ status: "ongoing" })));
    renderLayout();
    await screen.findByRole("status");
    expect(document.querySelectorAll("[data-maintenance-banner]").length).toBe(1);
    const region = banner()!;
    const header = document.querySelector("header")!;
    const main = document.querySelector("main")!;
    expect(region.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(region.parentElement).toBe(header.parentElement); // same content column: it never overlaps the fixed sidebar or the sticky header
    expect(region.className).not.toMatch(/\b(fixed|sticky|absolute)\b/);
    expect(region.className).toMatch(/max-w-full/); // cannot widen the page
  });

  it("does not block the page when the announcement endpoint is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderLayout();
    expect(screen.getByTestId("page")).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(banner()).toBeNull();
  });
});
