import { useEffect, useState } from "react";

/** Current viewport width (px). Tailwind breakpoints: sm = 640, md = 768. SSR/jsdom safe. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return width;
}

/** Breakpoints in rem, matching tailwind.config.ts `screens` (CSS media queries in rem follow the user's default font size). */
export const SM_REM = 40;
export const MD_REM = 48;
export const LG_REM = 64;

/** The user's root font size in px (16 unless they changed the browser default font size). */
export function rootFontPx(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 16;
  const px = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) && px > 0 ? px : 16;
}
export const remToPx = (rem: number): number => rem * rootFontPx();
/** True when the viewport is at least `rem` wide, measured in the user's own font size. */
export const viewportAtLeastRem = (rem: number): boolean => typeof window === "undefined" || window.innerWidth >= remToPx(rem);

// Kept for callers that want px at the default size.
export const SM_BREAKPOINT = 640;
export const MD_BREAKPOINT = 768;
export const LG_BREAKPOINT = 1024;
export default useViewportWidth;
