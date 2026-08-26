import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "admiino:theme";

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
};

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const applyTheme = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
};

/**
 * Light/dark/system theme switch persisted in localStorage.
 * Purely presentational — no backend involved.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const resolved: "light" | "dark" =
    theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;

  const toggle = useCallback(
    () => setTheme(resolved === "dark" ? "light" : "dark"),
    [resolved]
  );

  return { theme, setTheme, resolved, toggle };
}

export default useTheme;
