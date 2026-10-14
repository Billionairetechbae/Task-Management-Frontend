import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: "executive", firstName: "Ada", lastName: "Obi" }, logout: vi.fn(), workspaceRole: "owner" }),
}));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/components/integrations/IntegrationsDropdown", () => ({ default: () => null }));
vi.mock("@/components/notifications/NotificationsDropdown", () => ({ default: () => null }));
vi.mock("@/components/WebSocketStatus", () => ({ WebSocketStatus: () => null }));
// Each mounted selector is an element we can count; real behaviour is covered in onboarding-overlays.test.tsx.
vi.mock("@/components/WorkspaceSwitcher", () => ({ default: () => <div data-testid="ws-switcher" /> }));

import DashboardLayout from "@/components/dashboard/DashboardLayout";

const setWidth = (w: number) => { Object.defineProperty(window, "innerWidth", { value: w, configurable: true, writable: true }); };
const renderLayout = () => render(<MemoryRouter initialEntries={["/dashboard"]}><DashboardLayout><div>page</div></DashboardLayout></MemoryRouter>);
const count = () => screen.queryAllByTestId("ws-switcher").length;
const menuButton = (container: HTMLElement) => container.querySelector("button.md\\:hidden") as HTMLElement;
const original = window.innerWidth;

beforeEach(() => { localStorage.clear(); });
afterEach(() => { setWidth(original); });

describe("DashboardLayout mounts exactly one workspace selector", () => {
  it("desktop with the sidebar expanded: the sidebar owns it - no second copy in the header or the mobile drawer", () => {
    setWidth(1280);
    renderLayout();
    expect(count()).toBe(1);
    const asides = document.querySelectorAll("aside");
    const insideDesktopSidebar = asides[0].querySelectorAll('[data-testid="ws-switcher"]').length;
    const insideHeader = document.querySelector("header")!.querySelectorAll('[data-testid="ws-switcher"]').length;
    expect([insideDesktopSidebar, insideHeader]).toEqual([1, 0]);
    expect(asides[1].querySelectorAll('[data-testid="ws-switcher"]').length).toBe(0); // off-screen drawer copy is not mounted
  });

  it("desktop with the sidebar collapsed: the header owns it", () => {
    localStorage.setItem("admiino:preferences", JSON.stringify({ sidebarCollapsedByDefault: true }));
    setWidth(1280);
    renderLayout();
    expect(count()).toBe(1);
    expect(document.querySelector("header")!.querySelectorAll('[data-testid="ws-switcher"]').length).toBe(1);
  });

  it("tablet (640-767px): the header owns it; opening the drawer hands it to the drawer - never both", () => {
    setWidth(700);
    const { container } = renderLayout();
    expect(count()).toBe(1);
    expect(document.querySelector("header")!.querySelectorAll('[data-testid="ws-switcher"]').length).toBe(1);
    fireEvent.click(menuButton(container));
    expect(count()).toBe(1);
    expect(document.querySelector("header")!.querySelectorAll('[data-testid="ws-switcher"]').length).toBe(0);
    expect(document.querySelectorAll("aside")[1].querySelectorAll('[data-testid="ws-switcher"]').length).toBe(1);
  });

  it("phone (<640px): none until the drawer is opened, then exactly one (even if the saved preference is a collapsed sidebar)", () => {
    localStorage.setItem("admiino:preferences", JSON.stringify({ sidebarCollapsedByDefault: true }));
    setWidth(500);
    const { container } = renderLayout();
    expect(count()).toBe(0);
    fireEvent.click(menuButton(container));
    expect(count()).toBe(1);
  });

  it("crossing the breakpoint on resize never leaves two mounted", () => {
    setWidth(1280);
    renderLayout();
    for (const w of [1280, 900, 700, 500, 760, 1024, 639, 640, 1280]) {
      setWidth(w);
      act(() => { window.dispatchEvent(new Event("resize")); });
      expect(count(), `width ${w}`).toBeLessThanOrEqual(1);
    }
  });
});
