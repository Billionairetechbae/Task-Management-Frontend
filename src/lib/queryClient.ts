import { QueryClient } from "@tanstack/react-query";

/**
 * Single shared QueryClient for the whole app.
 * Memory-only cache (nothing persisted to localStorage) so tokens and
 * sensitive API responses are never written to disk.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

/** Clear everything — only on logout. */
export const clearAllQueryCache = () => {
  queryClient.clear();
};

/**
 * Drop cached data that belongs to a specific workspace so one workspace
 * never shows another workspace's data.
 */
export const clearWorkspaceQueryCache = (companyId?: string | null) => {
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey as unknown[];
      if (!Array.isArray(key)) return false;
      // Any query whose key contains the previous workspace id.
      if (companyId && key.some((part) => part === companyId)) return true;
      // Legacy keys without workspace scoping — safest to drop them too.
      return false;
    },
  });
};
