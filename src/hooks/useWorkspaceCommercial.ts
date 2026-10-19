import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

/** Subscription data is visible to workspace owners and admins only; other roles never trigger the request. */
export function useWorkspaceCommercial() {
  const { activeCompanyId, workspaceRole } = useAuth();
  const permitted = ["owner", "admin"].includes(String(workspaceRole));
  const query = useQuery({
    queryKey: ["workspace-commercial", activeCompanyId],
    queryFn: () => api.getWorkspaceCommercial(),
    enabled: Boolean(activeCompanyId && permitted),
    staleTime: 15_000,
    retry: false,
  });
  return { ...query, overview: query.data?.data, permitted };
}
