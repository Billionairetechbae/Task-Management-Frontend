import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export function useWorkspaceGovernance() {
  const { activeCompanyId, workspaceRole } = useAuth();
  const capabilities = useQuery({
    queryKey: ["workspace-governance-capabilities", activeCompanyId],
    queryFn: () => api.getWorkspaceGovernanceCapabilities ? api.getWorkspaceGovernanceCapabilities() : Promise.resolve({ status: "success", data: { googleDriveEnabled: true, dropboxEnabled: true, automationsEnabled: true, timeTrackingEnabled: true, memberInvitesRestricted: false, projectCreationRestricted: false, teamManagementRestricted: false, clientInvitesRestricted: false, integrationManagementRestricted: false } }),
    enabled: Boolean(activeCompanyId && ["owner", "admin", "manager", "member"].includes(String(workspaceRole))),
    staleTime: 15_000,
    retry: false,
  });
  const query = useQuery({
    queryKey: ["workspace-governance", activeCompanyId],
    queryFn: () => api.getWorkspaceGovernance(),
    enabled: Boolean(activeCompanyId && ["owner", "admin"].includes(String(workspaceRole))),
    staleTime: 15_000,
    retry: false,
  });
  return { ...query, settings: query.data?.data.settings, capabilities: capabilities.data?.data, permitted: ["owner", "admin"].includes(String(workspaceRole)) };
}
