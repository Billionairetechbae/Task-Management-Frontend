import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type RoleOperationPermissions,
  type WorkspaceRolePermissionKey,
  type WorkspaceSettings,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export type UiWorkspaceRoleLabel = "Executive" | "Manager" | "Team Member";
export type ApiWorkspaceRole = "owner" | "admin" | "manager" | "member";

export const toApiRole = (role: UiWorkspaceRoleLabel): "admin" | "manager" | "member" => {
  if (role === "Executive") return "admin";
  if (role === "Manager") return "manager";
  return "member";
};

export const toUiRole = (role?: string | null): UiWorkspaceRoleLabel => {
  if (role === "admin") return "Executive";
  if (role === "manager") return "Manager";
  return "Team Member";
};

export const workspacePermissionKeys: WorkspaceRolePermissionKey[] = [
  "create_tasks",
  "view_all_tasks",
  "create_projects",
  "view_all_projects",
  "create_project_tasks",
  "upload_workspace_files",
];

const defaultRolePermissionSet = {
  create_tasks: true,
  view_all_tasks: true,
  create_projects: true,
  view_all_projects: true,
  create_project_tasks: true,
  upload_workspace_files: true,
};

const defaultRoleOperationPermissions: RoleOperationPermissions = {
  admin: { ...defaultRolePermissionSet },
  manager: { ...defaultRolePermissionSet },
  member: {
    create_tasks: false,
    view_all_tasks: false,
    create_projects: false,
    view_all_projects: false,
    create_project_tasks: false,
    upload_workspace_files: false,
  },
};

const normalizeSettings = (raw: unknown): WorkspaceSettings => {
  const payload = raw as { settings?: WorkspaceSettings } | WorkspaceSettings | undefined;
  const settings: WorkspaceSettings = payload && "settings" in (payload as any) ? (payload as any).settings || {} : ((payload as WorkspaceSettings) || {});
  const roleOperationPermissions = settings.roleOperationPermissions ?? defaultRoleOperationPermissions;
  return {
    invitePermissionMode: settings.invitePermissionMode || "restricted",
    assistancePermissionMode: settings.assistancePermissionMode || "restricted",
    roleOperationPermissions: {
      admin: { ...defaultRoleOperationPermissions.admin, ...(roleOperationPermissions?.admin || {}) },
      manager: { ...defaultRoleOperationPermissions.manager, ...(roleOperationPermissions?.manager || {}) },
      member: { ...defaultRoleOperationPermissions.member, ...(roleOperationPermissions?.member || {}) },
    },
    configurableRoles: settings.configurableRoles || ["admin", "manager", "member"],
  };
};

export const resolveEffectiveRoleForUI = (userRole?: string | null, workspaceRole?: string | null): ApiWorkspaceRole => {
  if (workspaceRole === "owner" || workspaceRole === "admin" || workspaceRole === "manager" || workspaceRole === "member") {
    return workspaceRole;
  }
  if (userRole === "admin") return "owner";
  if (userRole === "executive") return "admin";
  if (userRole === "manager") return "manager";
  return "member";
};

export const getCurrentWorkspaceRole = resolveEffectiveRoleForUI;

export const canRolePerform = (
  permissionKey: WorkspaceRolePermissionKey,
  settings: WorkspaceSettings | undefined,
  role: ApiWorkspaceRole
): boolean => {
  if (role === "owner") return true;
  if (!settings?.roleOperationPermissions) return false;
  return !!settings.roleOperationPermissions[role]?.[permissionKey];
};

export const useWorkspaceSettings = () => {
  const { activeCompanyId, user, workspaceRole } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["workspaceSettings", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const response = await api.getWorkspaceSettings(activeCompanyId!);
      return normalizeSettings(response.data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<WorkspaceSettings>) => {
      const response = await api.updateWorkspaceSettings(activeCompanyId!, payload);
      return normalizeSettings(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceSettings", activeCompanyId] });
    },
  });

  const canPerformRoleOperation = (key?: WorkspaceRolePermissionKey, roleOverride?: string | null): boolean => {
    if (!key) return true;
    const effectiveRole = resolveEffectiveRoleForUI(user?.role, roleOverride ?? workspaceRole);
    return canRolePerform(key, query.data, effectiveRole);
  };

  return useMemo(
    () => ({
      activeCompanyId,
      settings: query.data,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      permissionKeys: workspacePermissionKeys,
      updateSettings: updateMutation.mutateAsync,
      isUpdating: updateMutation.isPending,
      refetch: query.refetch,
      canPerformRoleOperation,
    }),
    [
      activeCompanyId,
      query.data,
      query.isLoading,
      query.isFetching,
      query.refetch,
      updateMutation.mutateAsync,
      updateMutation.isPending,
      user?.role,
      workspaceRole,
    ]
  );
};
