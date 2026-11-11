import { useEffect, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api";
import { parseActiveResponse, type PublicMaintenance } from "@/lib/maintenanceBanner";

/** How often the shared announcement is revalidated while the app is open, and the longest a failed refresh may keep showing the last answer. */
export const MAINTENANCE_REFRESH_MS = 60_000;
export const MAINTENANCE_MAX_STALE_MS = 5 * 60_000;
export const maintenanceQueryKey = ["maintenance", "active", "portal"] as const;

/** Public, unauthenticated read. Deliberately NOT routed through api.request: a banner failure must never log the user out, raise error reports or show a toast. */
export async function fetchActiveMaintenance(signal?: AbortSignal): Promise<PublicMaintenance | null> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 8_000);
  const abort = () => timeout.abort();
  signal?.addEventListener("abort", abort);
  try {
    const response = await fetch(`${API_BASE_URL}/system/maintenance/active?surface=portal`, { headers: { Accept: "application/json" }, credentials: "omit", signal: timeout.signal });
    if (!response.ok) throw new Error(`maintenance status ${response.status}`);
    return parseActiveResponse(await response.json());
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

/**
 * The ONE shared source for the banner (mounted by DashboardLayout): loads on mount, refreshes every minute while the tab is visible,
 * and revalidates when the tab regains focus. Failures are silent and never retried aggressively; after MAX_STALE the last answer is dropped.
 */
export function useMaintenanceBanner(): PublicMaintenance | null {
  const query = useQuery({
    queryKey: maintenanceQueryKey,
    queryFn: ({ signal }) => fetchActiveMaintenance(signal),
    refetchInterval: MAINTENANCE_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
    retry: false,
    meta: { silent: true },
  });
  // React Query only re-renders for the fields a component reads, so a FAILED refresh would never re-check the age of the cached
  // answer. This timer does, which is what makes the staleness bound real.
  const [, expire] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!query.dataUpdatedAt) return undefined;
    const remaining = query.dataUpdatedAt + MAINTENANCE_MAX_STALE_MS - Date.now();
    if (remaining <= 0) return undefined;
    const timer = setTimeout(expire, remaining + 25);
    return () => clearTimeout(timer);
  }, [query.dataUpdatedAt]);
  if (!query.data) return null;
  return Date.now() - query.dataUpdatedAt > MAINTENANCE_MAX_STALE_MS ? null : query.data;
}
