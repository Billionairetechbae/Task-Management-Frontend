import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type RoleOperationPermissions,
  type RolePermissionSet,
  type WorkspaceRolePermissionKey,
  type WorkspaceSettings,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export type UiWorkspaceRoleLabel = "Executive" | "Manager" | "Team Member";
export type ApiWorkspaceRole = "owner" | "admin" | "manager" | "member";

export const toApiRole = (
  role: UiWorkspaceRoleLabel
): "admin" | "manager" | "member" => {
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

const defaultAllTruePermissionSet: RolePermissionSet = {
  create_tasks: true,
  view_all_tasks: true,
  create_projects: true,
  view_all_projects: true,
  create_project_tasks: true,
  upload_workspace_files: true,
};

const defaultMemberPermissionSet: RolePermissionSet = {
  create_tasks: false,
  view_all_tasks: true,
  create_projects: false,
  view_all_projects: true,
  create_project_tasks: false,
  upload_workspace_files: false,
};

const defaultRoleOperationPermissions: RoleOperationPermissions = {
  admin: { ...defaultAllTruePermissionSet },
  manager: { ...defaultAllTruePermissionSet },
  member: { ...defaultMemberPermissionSet },
};

const normalizeRoleOperationPermissions = (
  input?: Partial<RoleOperationPermissions>
): RoleOperationPermissions => {
  return {
    admin: {
      ...defaultRoleOperationPermissions.admin,
      ...(input?.admin || {}),
    },
    manager: {
      ...defaultRoleOperationPermissions.manager,
      ...(input?.manager || {}),
    },
    member: {
      ...defaultRoleOperationPermissions.member,
      ...(input?.member || {}),
    },
  };
};

const normalizePermissionSet = (
  input?: Partial<RolePermissionSet>,
  fallback: RolePermissionSet = defaultMemberPermissionSet
): RolePermissionSet => {
  const normalized = {} as RolePermissionSet;

  workspacePermissionKeys.forEach((key) => {
    normalized[key] =
      input && Object.prototype.hasOwnProperty.call(input, key)
        ? Boolean(input[key])
        : Boolean(fallback[key]);
  });

  return normalized;
};

const normalizeSettings = (raw: unknown): WorkspaceSettings => {
  const payload = raw as
    | { settings?: WorkspaceSettings }
    | WorkspaceSettings
    | undefined;

  const settings: WorkspaceSettings =
    payload && "settings" in (payload as any)
      ? (payload as any).settings || {}
      : (payload as WorkspaceSettings) || {};

  const roleOperationPermissions = normalizeRoleOperationPermissions(
    settings.roleOperationPermissions
  );

  return {
    invitePermissionMode: settings.invitePermissionMode || "restricted",
    assistancePermissionMode: settings.assistancePermissionMode || "restricted",
    roleOperationPermissions,
    effectiveOperationPermissions: settings.effectiveOperationPermissions,
    userPermissionOverrides: settings.userPermissionOverrides || {},
    configurableRoles: settings.configurableRoles || [
      "admin",
      "manager",
      "member",
    ],
  };
};

export const resolveEffectiveRoleForUI = (
  userRole?: string | null,
  workspaceRole?: string | null
): ApiWorkspaceRole => {
  if (
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager" ||
    workspaceRole === "member"
  ) {
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
      const [settingsResponse, effectiveResponse] = await Promise.allSettled([
        api.getWorkspaceSettings(activeCompanyId!),
        api.getMyEffectiveWorkspacePermissions(),
      ]);

      const settingsRaw =
        settingsResponse.status === "fulfilled"
          ? settingsResponse.value.data
          : {};

      const normalized = normalizeSettings(settingsRaw);

      const effectiveRole = resolveEffectiveRoleForUI(
        user?.role,
        workspaceRole
      );

      const fallbackRole =
        effectiveRole === "owner"
          ? "admin"
          : (effectiveRole as "admin" | "manager" | "member");

      if (effectiveResponse.status === "fulfilled") {
        const effectiveData = effectiveResponse.value.data;

        return {
          ...normalized,
          effectiveOperationPermissions: normalizePermissionSet(
            effectiveData.permissions,
            normalized.roleOperationPermissions?.[fallbackRole] ||
              defaultMemberPermissionSet
          ),
          userPermissionOverrides: effectiveData.individualOverrides || {},
        };
      }

      return {
        ...normalized,
        effectiveOperationPermissions:
          effectiveRole === "owner"
            ? { ...defaultAllTruePermissionSet }
            : normalizePermissionSet(
                normalized.roleOperationPermissions?.[fallbackRole],
                defaultMemberPermissionSet
              ),
        userPermissionOverrides: {},
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<WorkspaceSettings>) => {
      const response = await api.updateWorkspaceSettings(
        activeCompanyId!,
        payload
      );

      return normalizeSettings(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspaceSettings", activeCompanyId],
      });
    },
  });

  const canPerformRoleOperation = (
    key?: WorkspaceRolePermissionKey,
    roleOverride?: string | null
  ): boolean => {
    if (!key) return true;

    const effectiveRole = resolveEffectiveRoleForUI(
      user?.role,
      roleOverride ?? workspaceRole
    );

    if (effectiveRole === "owner") return true;

    const isCurrentUserCheck = !roleOverride || roleOverride === workspaceRole;

    if (isCurrentUserCheck && query.data?.effectiveOperationPermissions) {
      return !!query.data.effectiveOperationPermissions[key];
    }

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