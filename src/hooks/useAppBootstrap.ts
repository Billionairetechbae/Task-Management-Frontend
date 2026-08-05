import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { api } from "@/lib/api";
import { fetchDashboardData, fetchProjects } from "@/hooks/useCoreQueries";

/**
 * Post-login bootstrap: warms the cache for the screens users hit first
 * (dashboard, projects, tasks) so navigation feels instant.
 * Runs once per user + workspace combination.
 */
export const useAppBootstrap = () => {
  const { user, activeCompanyId, workspaceRole } = useAuth();
  const queryClient = useQueryClient();
  const bootstrappedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      bootstrappedFor.current = null;
      return;
    }

    const signature = `${user.id}:${activeCompanyId ?? "none"}:${workspaceRole ?? "none"}`;
    if (bootstrappedFor.current === signature) return;
    bootstrappedFor.current = signature;

    const prefetch = async () => {
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: queryKeys.dashboard(activeCompanyId, workspaceRole),
          queryFn: () => fetchDashboardData(workspaceRole, user.id),
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.projects(activeCompanyId),
          queryFn: fetchProjects,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.taskList(activeCompanyId, { page: 1, limit: 50 }),
          queryFn: () => api.getAllTasksCrossWorkspace({ page: 1, limit: 50 }),
        }),
      ]);
    };

    // Defer slightly so the first paint isn't competing with prefetches.
    const timer = setTimeout(prefetch, 250);
    return () => clearTimeout(timer);
  }, [user, activeCompanyId, workspaceRole, queryClient]);
};

export default useAppBootstrap;
