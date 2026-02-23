import { UserRole, WorkspaceRole } from "@/lib/api";

export const inferWorkspaceRole = (
  workspaceRole: WorkspaceRole | null | undefined,
  globalRole: UserRole | null | undefined
): WorkspaceRole => {
  if (workspaceRole) return workspaceRole;
  if (!globalRole) return "member";

  if (globalRole === "admin") return "owner";
  if (globalRole === "executive") return "owner";
  if (globalRole === "manager") return "manager";

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

