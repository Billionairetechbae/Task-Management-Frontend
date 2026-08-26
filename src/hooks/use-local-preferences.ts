import { useCallback, useEffect, useState } from "react";

export type Density = "comfortable" | "compact";

export interface LocalPreferences {
  /* appearance */
  density: Density;
  reduceMotion: boolean;
  /* navigation */
  defaultLandingPage: string;
  sidebarCollapsedByDefault: boolean;
  /* behaviour */
  confirmBeforeDelete: boolean;
  tablePageSize: number;
  /* notifications (device-local) */
  desktopNotifications: boolean;
  notificationSound: boolean;
  mentionsOnly: boolean;
  showUnreadBadge: boolean;
}

export const DEFAULT_PREFERENCES: LocalPreferences = {
  density: "comfortable",
  reduceMotion: false,
  defaultLandingPage: "/dashboard",
  sidebarCollapsedByDefault: false,
  confirmBeforeDelete: true,
  tablePageSize: 6,
  desktopNotifications: false,
  notificationSound: true,
  mentionsOnly: false,
  showUnreadBadge: true,
};

const STORAGE_KEY = "admiino:preferences";

export const readPreferences = (): LocalPreferences => {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) || {}) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const applyPreferences = (prefs: LocalPreferences) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("density-compact", prefs.density === "compact");
  root.classList.toggle("reduce-motion", prefs.reduceMotion);
};

/**
 * Device-local UI preferences. Nothing here touches the backend — values are
 * persisted in localStorage and applied to the document root.
 */
export function useLocalPreferences() {
  const [prefs, setPrefs] = useState<LocalPreferences>(readPreferences);

  useEffect(() => {
    applyPreferences(prefs);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const update = useCallback(
    <K extends keyof LocalPreferences>(key: K, value: LocalPreferences[K]) =>
      setPrefs((p) => ({ ...p, [key]: value })),
    []
  );

  const reset = useCallback(() => setPrefs(DEFAULT_PREFERENCES), []);

  return { prefs, update, reset };
}

export default useLocalPreferences;
