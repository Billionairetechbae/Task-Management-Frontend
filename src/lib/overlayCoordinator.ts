import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * One source of truth for first-run / workspace overlays, replacing several independent `open` booleans.
 *
 * Rules (enforced here, not by each component):
 *  1. Onboarding overlays (welcome profile modal, product tour) have absolute priority. While ANY onboarding
 *     overlay is waiting or showing, no other overlay can open, and one that is already open is closed.
 *  2. Onboarding overlays are shown one after another (first come, first served), never together.
 *  3. Otherwise at most ONE other overlay (a workspace switcher menu, the create-workspace dialog, ...) is open;
 *     opening one closes whichever was open.
 *     An onboarding overlay may also DECLARE its intent before it is ready to render (e.g. the tour waits 1s for the page
 *     to settle). A declared intent counts as "onboarding busy": selectors stay locked and the post-onboarding redirect
 *     waits, so there is no gap in which a selector or the setup page can sneak in between two onboarding steps.
 *  4. The global "workspace:switcher-open" event (fired by the API client when a request lacks a workspace) opens
 *     exactly ONE switcher - the most recently mounted one - and is ignored during onboarding.
 */
interface OverlayState {
  /** Ids of onboarding overlays that want to be shown, in arrival order. queue[0] is the one on screen. */
  onboardingQueue: readonly string[];
  /** Onboarding overlays that will want the screen shortly but are not rendering yet. */
  onboardingIntents: readonly string[];
  /** The single non-onboarding overlay that is currently open, if any. */
  activeOverlay: string | null;
  /** Mounted workspace switchers in mount order (used to route the open-event to one of them). */
  switchers: readonly string[];
}

const initial: OverlayState = { onboardingQueue: [], onboardingIntents: [], activeOverlay: null, switchers: [] };
let state: OverlayState = initial;
const listeners = new Set<() => void>();

function set(next: Partial<OverlayState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const getOverlayState = () => state;
export function subscribeOverlays(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
/** True while any onboarding overlay is showing, waiting its turn, or has declared it is about to show. */
export const isOnboardingBusy = (s: OverlayState = state) => s.onboardingQueue.length > 0 || s.onboardingIntents.length > 0;
export const isOnboardingActive = () => isOnboardingBusy();

/* ------------------------------- onboarding ------------------------------- */
export function enqueueOnboarding(id: string) {
  if (state.onboardingQueue.includes(id)) return;
  // Rule 1: a non-onboarding overlay that is open gets closed the moment onboarding wants the screen.
  set({ onboardingQueue: [...state.onboardingQueue, id], activeOverlay: null });
}
export function declareOnboardingIntent(id: string) {
  if (state.onboardingIntents.includes(id)) return;
  set({ onboardingIntents: [...state.onboardingIntents, id], activeOverlay: null });
}
export function clearOnboardingIntent(id: string) {
  if (!state.onboardingIntents.includes(id)) return;
  set({ onboardingIntents: state.onboardingIntents.filter((x) => x !== id) });
}
export function dequeueOnboarding(id: string) {
  if (!state.onboardingQueue.includes(id)) return;
  set({ onboardingQueue: state.onboardingQueue.filter((x) => x !== id) });
}

/* -------------------------- all other overlays --------------------------- */
/** Returns false (and does nothing) while onboarding is active. */
export function openOverlay(id: string): boolean {
  if (isOnboardingActive()) return false;
  if (state.activeOverlay !== id) set({ activeOverlay: id });
  return true;
}
export function closeOverlay(id: string) {
  if (state.activeOverlay === id) set({ activeOverlay: null });
}

/* ------------------------------- switchers -------------------------------- */
export function registerSwitcher(id: string) {
  if (state.switchers.includes(id)) return;
  set({ switchers: [...state.switchers, id] });
}
export function unregisterSwitcher(id: string) {
  if (!state.switchers.includes(id)) return;
  set({ switchers: state.switchers.filter((x) => x !== id), activeOverlay: state.activeOverlay === id ? null : state.activeOverlay });
}
/** Open exactly one switcher (the most recently mounted). Ignored during onboarding or when none is mounted. */
export function requestSwitcherOpen(): boolean {
  const target = state.switchers[state.switchers.length - 1];
  return target ? openOverlay(target) : false;
}

// One window listener for the whole app (previously every switcher instance added its own, so all opened at once).
export const SWITCHER_EVENT = "workspace:switcher-open";
let bridged = false;
export function installSwitcherEventBridge() {
  if (bridged || typeof window === "undefined") return;
  bridged = true;
  window.addEventListener(SWITCHER_EVENT, () => { requestSwitcherOpen(); });
}
installSwitcherEventBridge();

/** Test helper: back to a pristine coordinator. */
export function resetOverlayCoordinator() {
  state = { ...initial, onboardingQueue: [], onboardingIntents: [], switchers: [] };
  listeners.forEach((l) => l());
}

/* --------------------------------- hooks ---------------------------------- */
export function useOverlayState(): OverlayState {
  return useSyncExternalStore(subscribeOverlays, getOverlayState, getOverlayState);
}

/** An ordinary (non-onboarding) overlay. `blocked` is true while onboarding owns the screen. */
export function useOverlay(id: string) {
  const s = useOverlayState();
  const open = useCallback(() => openOverlay(id), [id]);
  const close = useCallback(() => closeOverlay(id), [id]);
  useEffect(() => () => closeOverlay(id), [id]); // an unmounted overlay can never stay "open"
  return { isOpen: s.activeOverlay === id && !isOnboardingBusy(s), blocked: isOnboardingBusy(s), open, close };
}

/** Marks a workspace switcher as mounted so the global open-event can reach exactly one of them. */
export function useSwitcherRegistration(id: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    registerSwitcher(id);
    return () => unregisterSwitcher(id);
  }, [id, enabled]);
}

/** Declare that an onboarding overlay is coming (even if it is not rendering yet). */
export function useOnboardingIntent(id: string, pending: boolean) {
  useEffect(() => {
    if (pending) declareOnboardingIntent(id); else clearOnboardingIntent(id);
    return () => clearOnboardingIntent(id);
  }, [id, pending]);
}

/**
 * Onboarding overlay slot. Pass whether the overlay WANTS to be open; the return value says whether it is this
 * overlay's turn to actually render. When it finishes (wants -> false) the next waiting onboarding overlay gets its turn.
 */
export function useOnboardingSlot(id: string, wantsOpen: boolean): boolean {
  const s = useOverlayState();
  useEffect(() => {
    if (wantsOpen) enqueueOnboarding(id); else dequeueOnboarding(id);
    return () => dequeueOnboarding(id);
  }, [id, wantsOpen]);
  return wantsOpen && s.onboardingQueue[0] === id;
}
