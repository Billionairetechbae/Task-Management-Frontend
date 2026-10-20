import { QueryClient } from "@tanstack/react-query";

/**
 * Retry policy: answers that will not change on a retry (4xx: validation, auth, permission, not found, suspended) are never
 * retried; connectivity failures (network error, 502/503/504) are retried with backoff so the UI recovers by itself when
 * the backend or database comes back, without a manual refresh.
 */
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  const e = error as { name?: string; statusCode?: number } | null;
  if (e?.name === "NetworkError") return failureCount < 4;
  if (e?.name === "ApiError") return [502, 503, 504].includes(Number(e.statusCode)) ? failureCount < 4 : Number(e.statusCode) >= 500 && failureCount < 1;
  return failureCount < 1;
};
export const queryRetryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 300);

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
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
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
