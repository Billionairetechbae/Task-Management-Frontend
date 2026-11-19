import * as React from "react";
import { remToPx } from "@/hooks/use-viewport-width";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${(MOBILE_BREAKPOINT - 1) / 16}rem)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < remToPx(MOBILE_BREAKPOINT / 16));
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < remToPx(MOBILE_BREAKPOINT / 16));
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
