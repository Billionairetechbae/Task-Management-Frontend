import { useReducer } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { useContext } from "react";
import { MaintenanceBannerView } from "@/components/MaintenanceBannerView";
import { useMaintenanceBanner } from "@/hooks/useMaintenanceBanner";
import { dismiss, isDismissed, isDismissible } from "@/lib/maintenanceBanner";

function Banner() {
  const announcement = useMaintenanceBanner();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  if (!announcement || isDismissed(announcement)) return null;
  return (
    <MaintenanceBannerView
      announcement={announcement}
      onDismiss={isDismissible(announcement.status) ? () => { dismiss(announcement); rerender(); } : undefined}
    />
  );
}

/**
 * Platform maintenance / service announcement for the authenticated app. Mounted by DashboardLayout (and the few standalone
 * authenticated pages) above the page header. Renders nothing without a QueryClient, so isolated component tests are unaffected.
 */
export function MaintenanceBanner() {
  return useContext(QueryClientContext) ? <Banner /> : null;
}

export default MaintenanceBanner;
