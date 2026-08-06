import * as React from "react";

const MOBILE_MAX = 767; // < 768 => mobile
const TABLET_MAX = 1279; // 768..1279 => tablet, >= 1280 => desktop

export type Breakpoint = "mobile" | "tablet" | "desktop";

function resolve(width: number): Breakpoint {
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

/**
 * Responsive breakpoint hook used by multi-column layouts
 * (task workbench, dashboards) to switch between mobile sheets,
 * tablet two-column and desktop three-column presentations.
 */
export function useBreakpoint() {
  const [bp, setBp] = React.useState<Breakpoint>(() =>
    typeof window === "undefined" ? "desktop" : resolve(window.innerWidth)
  );

  React.useEffect(() => {
    const onResize = () => setBp(resolve(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return {
    breakpoint: bp,
    isMobile: bp === "mobile",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
    /** tablet or mobile — i.e. no room for three columns */
    isCompact: bp !== "desktop",
  };
}

export default useBreakpoint;
