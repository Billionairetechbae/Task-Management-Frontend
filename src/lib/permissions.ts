import { UserRole, WorkspaceRole } from "@/lib/api";

export const inferWorkspaceRole = (
  workspaceRole: WorkspaceRole | null | undefined,
  globalRole: UserRole | null | undefined
): WorkspaceRole => {
  if (workspaceRole) return workspaceRole;
  if (globalRole === "admin") return "owner";
  return "member";
};

export const canManageWorkspace = (
  workspaceRole: WorkspaceRole | null | undefined,
  globalRole: UserRole | null | undefined
): boolean => {
  if (globalRole === "admin") return true;
  const effective = inferWorkspaceRole(workspaceRole, globalRole);
  return effective === "owner" || effective === "admin" || effective === "manager";
};

export const canAdminWorkspace = (
  workspaceRole: WorkspaceRole | null | undefined,
  globalRole: UserRole | null | undefined
): boolean => {
  if (globalRole === "admin") return true;
  const effective = inferWorkspaceRole(workspaceRole, globalRole);
  return effective === "owner" || effective === "admin";
};


/**
 * Workspace export is authorized by workspace role only.
 * Backend Phase 1: owner and admin are allowed; manager/member/guest denied.
 * Platform admin bypass is enforced server-side; we do NOT rely on globalRole here.
 */
export const canExportWorkspace = (
  workspaceRole: WorkspaceRole | null | undefined,
): boolean => {
  return workspaceRole === "owner" || workspaceRole === "admin";
};