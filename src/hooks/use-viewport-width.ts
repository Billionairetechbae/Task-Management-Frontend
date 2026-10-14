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

export const SM_BREAKPOINT = 640;
export const MD_BREAKPOINT = 768;
export default useViewportWidth;
