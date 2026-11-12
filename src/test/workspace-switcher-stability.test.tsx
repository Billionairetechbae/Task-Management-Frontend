import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Regression suite for the production defect "the sidebar workspace dropdown closes almost immediately, 6-8 times in a row".
 *
 * Root cause: DashboardLayout declared `const SidebarContent = () => ...` INSIDE its own body. A component type created during render has a new
 * identity on every render, so React unmounts and remounts the whole sidebar (the switcher and its open menu included) whenever DashboardLayout
 * re-renders - and it re-renders on every AuthContext change (token/user/workspace refreshes, which hand every consumer a fresh value). The
 * remounted switcher has a new useId() and the old one's unmount cleanup closes the shared overlay, so the menu vanished.
 *
 * These tests use the REAL DashboardLayout, the REAL WorkspaceSwitcher and the REAL Radix menu; only the data layer is replaced by a store whose
 * updates hand consumers a brand-new auth object and a brand-new workspaces array each time, exactly like a background refresh does.
 */
interface Ws { id: string; name: string; role: string; status: string }
interface Snap { user: { id: string; role: string; firstName: string; lastName: string }; loading: boolean; workspaces: Ws[]; activeCompanyId: string; workspaceRole: string | null; activeWorkspace: Ws | null; refreshUser: () => void }
interface Store { snap: Snap; subs: Set<() => void>; select: ReturnType<typeof vi.fn>; set: (next: Snap) => void }

const h = vi.hoisted((): Store => {
  const subs = new Set<() => void>();
  const state = { snap: null as unknown as Snap, subs, select: null as unknown as ReturnType<typeof vi.fn> } as Store;
  state.set = (next) => { state.snap = next; subs.forEach((f) => f()); };
  return state;
});

vi.mock("@/contexts/AuthContext", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useAuth: () => {
      const snap = useSyncExternalStore((cb) => { h.subs.add(cb); return () => { h.subs.delete(cb); }; }, () => h.snap);
      return { ...snap, logout: vi.fn(), setActiveCompanyId: h.select }; // a fresh object every call, like an inline Provider value
    },
  };
});
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/components/integrations/IntegrationsDropdown", () => ({ default: () => null }));
vi.mock("@/components/notifications/NotificationsDropdown", () => ({ default: () => null }));
vi.mock("@/components/time/GlobalTimerIndicator", () => ({ default: () => null }));
vi.mock("@/components/WebSocketStatus", () => ({ WebSocketStatus: () => null }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
vi.mock("@/components/CreateWorkspaceDialog", () => ({ default: () => null }));
// Every API method resolves an empty payload: the layout's own badges/polls must not touch the network or crash the render.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const quiet = new Proxy({}, { get: (_t, prop) => (prop === "then" ? undefined : () => Promise.resolve({ data: {}, tickets: [], items: [], notifications: [] })) });
  return { ...actual, api: quiet, default: quiet };
});

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import * as overlays from "@/lib/overlayCoordinator";

const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `ws-${i + 1}`, name: ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark", "Wayne", "Wonka", "Soylent", "Cyberdyne", "Tyrell", "Oscorp"][i] ?? `Org ${i + 1}`, role: i === 0 ? "owner" : "member", status: "active" }));
const user = { id: "u1", role: "executive", firstName: "Ada", lastName: "Obi" };

function seed(workspaces = mk(3), activeId = "ws-1") {
  const snapshot = (list: Ws[], id: string): Snap => ({ user, loading: false, workspaces: list, activeCompanyId: id, workspaceRole: list.find((w) => w.id === id)?.role ?? null, activeWorkspace: list.find((w) => w.id === id) ?? null, refreshUser: vi.fn() });
  h.select = vi.fn((id: string) => h.set(snapshot(h.snap.workspaces, id)));
  h.set(snapshot(workspaces, activeId));
}
/** A background refresh: same data, brand-new objects and a brand-new workspaces array. */
const backgroundRefresh = (times = 1) => { for (let i = 0; i < times; i++) act(() => h.set({ ...h.snap, user: { ...h.snap.user }, workspaces: h.snap.workspaces.map((w) => ({ ...w })) })); };

const setWidth = (w: number) => { Object.defineProperty(window, "innerWidth", { value: w, configurable: true, writable: true }); };
const original = window.innerWidth;
const renderLayout = () => render(<TooltipProvider><MemoryRouter initialEntries={["/dashboard"]}><DashboardLayout><div data-testid="page">page</div></DashboardLayout></MemoryRouter></TooltipProvider>);
const trigger = () => screen.getByTestId("workspace-switcher-trigger");
const menu = () => screen.queryByRole("menu");
const sleep = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

beforeEach(() => {
  localStorage.clear();
  overlays.resetOverlayCoordinator();
  setWidth(1280);
  // jsdom gaps that Radix expects from a browser
  const win = window as unknown as Record<string, unknown>;
  const proto = Element.prototype as unknown as Record<string, unknown>;
  win.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
  seed();
});
afterEach(() => { setWidth(original); overlays.resetOverlayCoordinator(); });

const ui = () => userEvent.setup({ pointerEventsCheck: 0 });

describe("workspace switcher - opening and staying open (sidebar expanded)", () => {
  it("opens on the FIRST click and lists the workspaces with the active one marked", async () => {
    renderLayout();
    expect(document.querySelector("aside")!.contains(trigger())).toBe(true); // it is the sidebar copy
    await ui().click(trigger());
    expect(menu()).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("Acme"), expect.stringContaining("Globex"), expect.stringContaining("Initech")]));
    expect(options.filter((o) => o.getAttribute("aria-selected") === "true")).toHaveLength(1);
    expect(within(screen.getAllByRole("option")[0]).getByText("Acme")).toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("stays open with no interaction", async () => {
    renderLayout();
    await ui().click(trigger());
    await sleep(1200);
    expect(menu()).toBeInTheDocument();
  });

  it("stays open - same DOM, no remount - through repeated background context updates (the production defect)", async () => {
    renderLayout();
    await ui().click(trigger());
    const openMenu = menu()!;
    const openTrigger = trigger();
    backgroundRefresh(10);
    await sleep(50);
    expect(menu()).toBe(openMenu);
    expect(trigger()).toBe(openTrigger);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the typed search text and the focused search box through background updates", async () => {
    renderLayout();
    const u = ui();
    await u.click(trigger());
    const search = screen.getByLabelText("Search workspaces") as HTMLInputElement;
    await u.type(search, "glo");
    backgroundRefresh(6);
    await sleep(30);
    expect((screen.getByLabelText("Search workspaces") as HTMLInputElement).value).toBe("glo");
    expect(screen.getByLabelText("Search workspaces")).toBe(search);
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("stays open while the pointer travels from the trigger to the menu and across the options", async () => {
    renderLayout();
    const u = ui();
    await u.click(trigger());
    await u.hover(trigger());
    await u.hover(screen.getByRole("menu"));
    for (const option of screen.getAllByRole("option")) await u.hover(option);
    await u.unhover(screen.getAllByRole("option")[0]);
    expect(menu()).toBeInTheDocument();
  });

  it("survives a route change underneath it only by design: an unrelated page re-render does not close it", async () => {
    const { rerender } = renderLayout();
    await ui().click(trigger());
    rerender(<TooltipProvider><MemoryRouter initialEntries={["/dashboard"]}><DashboardLayout><div data-testid="page">page v2</div></DashboardLayout></MemoryRouter></TooltipProvider>);
    await sleep(30);
    expect(menu()).toBeInTheDocument();
  });
});

describe("workspace switcher - closing and selecting", () => {
  it("closes on an intentional outside click", async () => {
    renderLayout();
    const u = ui();
    await u.click(trigger());
    await u.click(screen.getByTestId("page"));
    await waitFor(() => expect(menu()).not.toBeInTheDocument());
  });

  it("closes on Escape, including while the search box has focus, and returns focus to the trigger", async () => {
    renderLayout();
    const u = ui();
    await u.click(trigger());
    await waitFor(() => expect(screen.getByLabelText("Search workspaces")).toHaveFocus());
    await u.keyboard("{Escape}");
    await waitFor(() => expect(menu()).not.toBeInTheDocument());
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it("selecting a workspace switches exactly once, closes the menu and shows the new active workspace", async () => {
    renderLayout();
    const u = ui();
    await u.click(trigger());
    await u.click(screen.getAllByRole("option").find((o) => o.textContent?.includes("Globex"))!);
    expect(h.select).toHaveBeenCalledTimes(1);
    expect(h.select).toHaveBeenCalledWith("ws-2");
    await waitFor(() => expect(menu()).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent("Globex");
    await u.click(trigger());
    const selected = screen.getAllByRole("option").filter((o) => o.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("Globex");
  });

  it("never sends a duplicate switch: a double click on an option, or re-choosing the active workspace, does not call setActiveCompanyId twice", async () => {
    renderLayout();
    const u = ui();
    await u.click(trigger());
    await u.dblClick(screen.getAllByRole("option").find((o) => o.textContent?.includes("Initech"))!);
    expect(h.select).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(menu()).not.toBeInTheDocument());

    h.select.mockClear();
    await u.click(trigger());
    await u.click(screen.getAllByRole("option").find((o) => o.getAttribute("aria-selected") === "true")!);
    expect(h.select).not.toHaveBeenCalled(); // already active: just close
    await waitFor(() => expect(menu()).not.toBeInTheDocument());
  });
});

describe("workspace switcher - many workspaces, collapsed sidebar, keyboard", () => {
  it("with many workspaces: pages through them, stays open while paging and while refreshing, and can select one from the later page", async () => {
    seed(mk(12));
    renderLayout();
    const u = ui();
    await u.click(trigger());
    expect(screen.getAllByRole("option")).toHaveLength(5);
    await u.click(screen.getByText("View more"));
    expect(menu()).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(10);
    backgroundRefresh(5);
    await sleep(30);
    expect(menu()).toBeInTheDocument();
    await u.click(screen.getAllByRole("option").find((o) => o.textContent?.includes("Wonka"))!);
    expect(h.select).toHaveBeenCalledWith("ws-8");
  });

  it("with the sidebar collapsed the header copy is used and is equally stable", async () => {
    localStorage.setItem("admiino:preferences", JSON.stringify({ sidebarCollapsedByDefault: true }));
    renderLayout();
    expect(document.querySelector("header")!.contains(trigger())).toBe(true);
    await ui().click(trigger());
    const openMenu = menu()!;
    backgroundRefresh(8);
    await sleep(30);
    expect(menu()).toBe(openMenu);
  });

  it("is fully keyboard operable: Enter opens, ArrowDown from the search box reaches the list, Enter selects, focus returns to the trigger", async () => {
    renderLayout();
    const u = ui();
    trigger().focus();
    await u.keyboard("{Enter}");
    expect(menu()).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Search workspaces")).toHaveFocus());
    await u.keyboard("{ArrowDown}");
    const options = screen.getAllByRole("option");
    await waitFor(() => expect(options[0]).toHaveFocus());
    await u.keyboard("{ArrowDown}");
    await waitFor(() => expect(options[1]).toHaveFocus());
    await u.keyboard("{Enter}");
    expect(h.select).toHaveBeenCalledWith("ws-2");
    await waitFor(() => expect(menu()).not.toBeInTheDocument());
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it("the switcher on its own (no layout) is unaffected by context updates too", async () => {
    render(<TooltipProvider><WorkspaceSwitcher /></TooltipProvider>);
    await ui().click(trigger());
    const openMenu = menu()!;
    backgroundRefresh(10);
    expect(menu()).toBe(openMenu);
  });
});
