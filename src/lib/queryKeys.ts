/**
 * Centralised, workspace-scoped React Query keys.
 *
 * Every key embeds the active workspace (companyId) so switching workspaces
 * never shows data from the previous one, and caches stay warm per workspace.
 */
export type WorkspaceScope = string | null | undefined;

export const queryKeys = {
  dashboard: (companyId: WorkspaceScope, role?: string | null) =>
    ["dashboard", companyId ?? "none", role ?? "none"] as const,
  tasks: (companyId: WorkspaceScope) => ["tasks", companyId ?? "none"] as const,
  taskList: (companyId: WorkspaceScope, filters?: unknown) =>
    ["tasks", companyId ?? "none", "list", filters ?? null] as const,
  task: (companyId: WorkspaceScope, taskId: string) =>
    ["tasks", companyId ?? "none", "detail", taskId] as const,
  taskComments: (companyId: WorkspaceScope, taskId: string) =>
    ["tasks", companyId ?? "none", "comments", taskId] as const,
  projects: (companyId: WorkspaceScope) => ["projects", companyId ?? "none"] as const,
  project: (companyId: WorkspaceScope, projectId: string) =>
    ["projects", companyId ?? "none", "detail", projectId] as const,
  projectTasks: (companyId: WorkspaceScope, projectId: string) =>
    ["projects", companyId ?? "none", "tasks", projectId] as const,
  team: (companyId: WorkspaceScope) => ["team", companyId ?? "none"] as const,
  pendingVerifications: (companyId: WorkspaceScope) =>
    ["team", companyId ?? "none", "pending-verifications"] as const,
  notifications: (companyId: WorkspaceScope) =>
    ["notifications", companyId ?? "none"] as const,
} as const;

/** Root segments that are workspace data (used for bulk invalidation). */
export const workspaceQueryRoots = [
  "dashboard",
  "tasks",
  "projects",
  "team",
  "notifications",
] as const;
