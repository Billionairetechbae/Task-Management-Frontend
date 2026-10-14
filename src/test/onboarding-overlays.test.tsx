import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const h = vi.hoisted(() => ({
  auth: {} as any,
  updateOnboarding: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/lib/api", () => ({ api: { updateOnboarding: h.updateOnboarding } }));
vi.mock("@/components/CreateWorkspaceDialog", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Create workspace dialog">create</div> : null),
}));
vi.mock("@/hooks/use-theme", () => ({ default: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("@/hooks/use-local-preferences", () => ({ default: () => ({ prefs: {}, update: vi.fn() }), readPreferences: () => ({}) }));

import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import OnboardingTour from "@/components/OnboardingTour";
import OnboardingProfileModal from "@/components/OnboardingProfileModal";
import OnboardingFlowController from "@/components/OnboardingFlowController";
import * as overlays from "@/lib/overlayCoordinator";

const WS = [{ id: "ws-1", name: "Acme", role: "owner", status: "active" }, { id: "ws-2", name: "Globex", role: "member", status: "active" }];
const user = { id: "u1", role: "executive", firstName: "Ada" };

function setAuth(workspaces: any[]) {
  h.auth = {
    user, loading: false, workspaces, activeCompanyId: workspaces[0]?.id ?? null, setActiveCompanyId: vi.fn(),
    workspaceRole: workspaces[0]?.role ?? null, activeWorkspace: workspaces[0] ?? null, refreshUser: vi.fn(),
  };
}
const triggers = () => screen.queryAllByTestId("workspace-switcher-trigger");
const menus = () => screen.queryAllByRole("menu");
const openWithKeyboard = (trigger: HTMLElement) => { act(() => { trigger.focus(); }); fireEvent.keyDown(trigger, { key: "Enter" }); };
const fireSwitcherEvent = () => act(() => { window.dispatchEvent(new Event("workspace:switcher-open")); });

beforeEach(() => {
  overlays.resetOverlayCoordinator();
  localStorage.clear();
  setAuth(WS);
  h.updateOnboarding.mockReset().mockResolvedValue({});
});
afterEach(() => { overlays.resetOverlayCoordinator(); });

/* ----------------------------- the coordinator ----------------------------- */
describe("overlay coordinator rules", () => {
  it("nothing can open while onboarding is active, and an already-open overlay is closed when onboarding starts", () => {
    expect(overlays.openOverlay("menu-a")).toBe(true);
    expect(overlays.getOverlayState().activeOverlay).toBe("menu-a");
    overlays.enqueueOnboarding("onboarding:welcome");
    expect(overlays.getOverlayState().activeOverlay).toBeNull();
    expect(overlays.openOverlay("menu-a")).toBe(false);
    expect(overlays.getOverlayState().activeOverlay).toBeNull();
    overlays.dequeueOnboarding("onboarding:welcome");
    expect(overlays.openOverlay("menu-a")).toBe(true);
  });

  it("only one non-onboarding overlay is open at a time: opening one closes the other", () => {
    overlays.openOverlay("left"); overlays.openOverlay("right");
    expect(overlays.getOverlayState().activeOverlay).toBe("right");
    overlays.closeOverlay("left"); // closing a non-active overlay never closes the active one
    expect(overlays.getOverlayState().activeOverlay).toBe("right");
    overlays.openOverlay("create-dialog");
    expect(overlays.getOverlayState().activeOverlay).toBe("create-dialog");
  });

  it("onboarding overlays are strictly sequential (first come, first served)", () => {
    overlays.enqueueOnboarding("welcome"); overlays.enqueueOnboarding("tour"); overlays.enqueueOnboarding("welcome");
    expect(overlays.getOverlayState().onboardingQueue).toEqual(["welcome", "tour"]);
    overlays.dequeueOnboarding("welcome");
    expect(overlays.getOverlayState().onboardingQueue).toEqual(["tour"]);
    overlays.dequeueOnboarding("tour");
    expect(overlays.isOnboardingActive()).toBe(false);
  });

  it("the global 'workspace:switcher-open' event reaches exactly ONE switcher, and none during onboarding", () => {
    overlays.registerSwitcher("sidebar"); overlays.registerSwitcher("header");
    fireSwitcherEvent();
    expect(overlays.getOverlayState().activeOverlay).toBe("header");
    overlays.closeOverlay("header");
    overlays.enqueueOnboarding("welcome");
    fireSwitcherEvent();
    expect(overlays.getOverlayState().activeOverlay).toBeNull();
    overlays.dequeueOnboarding("welcome"); overlays.unregisterSwitcher("sidebar"); overlays.unregisterSwitcher("header");
    fireSwitcherEvent(); // nothing mounted -> ignored, no crash
    expect(overlays.getOverlayState().activeOverlay).toBeNull();
  });
});

/* --------------------------- the workspace switcher --------------------------- */
describe("WorkspaceSwitcher", () => {
  const renderSwitchers = (n = 1) => render(
    <MemoryRouter><TooltipProvider>{Array.from({ length: n }, (_, i) => <WorkspaceSwitcher key={i} />)}</TooltipProvider></MemoryRouter>
  );

  it("cannot be opened while onboarding is active: trigger is disabled, keyboard and global event do nothing", () => {
    renderSwitchers();
    act(() => overlays.enqueueOnboarding("onboarding:welcome"));
    const [trigger] = triggers();
    expect(trigger).toBeDisabled();
    openWithKeyboard(trigger); fireEvent.click(trigger); fireSwitcherEvent();
    expect(menus()).toHaveLength(0);
    expect(overlays.getOverlayState().activeOverlay).toBeNull();
  });

  it("an already-open selector closes when onboarding starts, and works again afterwards", async () => {
    renderSwitchers();
    openWithKeyboard(triggers()[0]);
    await waitFor(() => expect(menus()).toHaveLength(1));
    act(() => overlays.enqueueOnboarding("onboarding:welcome"));
    await waitFor(() => expect(menus()).toHaveLength(0));
    act(() => overlays.dequeueOnboarding("onboarding:welcome"));
    expect(triggers()[0]).not.toBeDisabled();
    openWithKeyboard(triggers()[0]);
    await waitFor(() => expect(menus()).toHaveLength(1));
  });

  it("only one workspace popover can be open: the global event opens one, and opening another closes the first", async () => {
    renderSwitchers(2); // simulates a duplicated selector
    expect(triggers()).toHaveLength(2);
    fireSwitcherEvent();
    await waitFor(() => expect(menus()).toHaveLength(1));
    expect(screen.getAllByText("Workspaces")).toHaveLength(1);
    const openTrigger = triggers().find((t) => t.getAttribute("aria-expanded") === "true")!;
    const other = triggers().find((t) => t !== openTrigger)!;
    openWithKeyboard(other);
    await waitFor(() => expect(other.getAttribute("aria-expanded")).toBe("true"));
    await waitFor(() => expect(openTrigger.getAttribute("aria-expanded")).toBe("false"));
    expect(menus()).toHaveLength(1);
  });

  it("'Create workspace' replaces the menu with the dialog (never both)", async () => {
    renderSwitchers();
    openWithKeyboard(triggers()[0]);
    await waitFor(() => expect(menus()).toHaveLength(1));
    fireEvent.click(await screen.findByText("Create workspace"));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Create workspace dialog" })).toBeInTheDocument());
    await waitFor(() => expect(menus()).toHaveLength(0));
  });

  it("renders nothing for a user with no workspace yet, and ignores the global event", () => {
    setAuth([]);
    const { container } = renderSwitchers(2);
    expect(container).toBeEmptyDOMElement();
    fireSwitcherEvent();
    expect(overlays.getOverlayState().activeOverlay).toBeNull();
  });
});

/* --------------------------- the sequential flow --------------------------- */
function Where() { const l = useLocation(); return <div data-testid="path">{l.pathname}</div>; }
function Harness() {
  const [profileOpen, setProfileOpen] = useState(true);
  return (
    <TooltipProvider>
      <OnboardingTour />
      <OnboardingProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} onSuccess={() => setProfileOpen(false)} />
      <OnboardingFlowController />
      <Where />
      <Routes>
        <Route path="/onboarding/workspace" element={<div data-testid="workspace-setup">Create workspace · Join workspace</div>} />
        <Route path="*" element={<div data-testid="home"><WorkspaceSwitcher /></div>} />
      </Routes>
    </TooltipProvider>
  );
}
const renderFlow = () => render(<MemoryRouter initialEntries={["/dashboard"]}><Harness /></MemoryRouter>);
const dialogs = () => screen.queryAllByRole("dialog");
const waitForTour = () => waitFor(() => expect(screen.getByText("Skip Tour")).toBeInTheDocument(), { timeout: 3500 });

describe("first-run onboarding is sequential", () => {
  it("shows ONE onboarding dialog at a time (welcome first, tour next), selectors locked meanwhile", async () => {
    renderFlow();
    await waitFor(() => expect(screen.getByText("Skip for now")).toBeInTheDocument());
    expect(dialogs()).toHaveLength(1);
    expect(triggers()[0]).toBeDisabled();
    await act(async () => { await new Promise((r) => setTimeout(r, 1300)); }); // the tour's own 1s timer elapses
    expect(dialogs()).toHaveLength(1); // the tour waits its turn instead of stacking
    expect(screen.queryByText("Skip Tour")).toBeNull();
    expect(menus()).toHaveLength(0);
    fireSwitcherEvent(); // even an API "pick a workspace" signal cannot open a selector over onboarding
    expect(menus()).toHaveLength(0);
  }, 10000);

  it("skipping welcome reveals the tour; skipping the tour sends a zero-workspace user to the create/join page", async () => {
    setAuth([]);
    renderFlow();
    fireEvent.click(await screen.findByText("Skip for now"));
    await waitForTour();
    expect(dialogs()).toHaveLength(1);
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard"); // not redirected while onboarding is still running
    fireEvent.click(screen.getByText("Skip Tour"));
    await waitFor(() => expect(screen.getByTestId("workspace-setup")).toBeInTheDocument());
    expect(screen.getByTestId("path")).toHaveTextContent("/onboarding/workspace");
    expect(dialogs()).toHaveLength(0);
    expect(triggers()).toHaveLength(0); // no workspace selector before a workspace exists
    expect(localStorage.getItem("admiino_onboarding_completed_u1")).toBe("true");
  }, 12000);

  it("completing the welcome flow (Finish setup) and the tour also reveals workspace setup", async () => {
    setAuth([]);
    renderFlow();
    await screen.findByText("Skip for now");
    fireEvent.click(screen.getByText("Continue")); fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(await screen.findByText("Finish setup"));
    await waitFor(() => expect(h.auth.refreshUser).toHaveBeenCalled());
    await waitForTour();
    for (let i = 0; i < 20 && !screen.queryByTestId("workspace-setup"); i++) {
      const next = screen.queryByText("Get Started") || screen.queryByText("Next");
      if (!next) break;
      fireEvent.click(next);
    }
    await waitFor(() => expect(screen.getByTestId("workspace-setup")).toBeInTheDocument());
    expect(dialogs()).toHaveLength(0);
  }, 15000);

  it("a user who already has a workspace stays put and gets the normal selector once onboarding ends", async () => {
    renderFlow();
    fireEvent.click(await screen.findByText("Skip for now"));
    await waitForTour();
    expect(triggers()[0]).toBeDisabled();
    fireEvent.click(screen.getByText("Skip Tour"));
    await waitFor(() => expect(dialogs()).toHaveLength(0));
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard");
    expect(screen.queryByTestId("workspace-setup")).toBeNull();
    expect(triggers()).toHaveLength(1);
    expect(triggers()[0]).not.toBeDisabled();
    fireSwitcherEvent();
    await waitFor(() => expect(menus()).toHaveLength(1));
  }, 12000);
});
