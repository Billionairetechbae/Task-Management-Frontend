import { Notification } from "@/lib/api";
import { teamSubtaskPath, teamTaskPath, taskWorkbenchPath } from "@/lib/taskExecutionRoutes";

/**
 * Resolve a navigation target for a given notification.
 * Looks at notification.data for known IDs (taskId, projectId, etc.)
 * and falls back by notification type.
 */
export function getNotificationLink(n: Notification): string {
  const d: any = n?.data || {};

  // Direct identifiers in data payload
  if (d.subtaskId && d.parentTaskId && d.teamId) return teamSubtaskPath(d.teamId, d.parentTaskId, d.subtaskId);
  if ((d.parentTaskId || d.parent_task_id) && d.teamId && (d.taskId || d.task_id)) return teamSubtaskPath(d.teamId, d.parentTaskId || d.parent_task_id, d.taskId || d.task_id);
  if (d.taskId && d.teamId) return teamTaskPath(d.teamId, d.taskId);
  if (d.task_id && d.teamId) return teamTaskPath(d.teamId, d.task_id);
  if (d.taskId) return taskWorkbenchPath(d.taskId);
  if (d.task_id) return taskWorkbenchPath(d.task_id);
  if (d.projectId) return `/projects/${d.projectId}`;
  if (d.project_id) return `/projects/${d.project_id}`;
  if (d.inviteToken) return `/invite/${d.inviteToken}`;
  if (d.invite_token) return `/invite/${d.invite_token}`;
  if (d.requestId && (n.type || "").includes("access")) return "/workspace-access";
  if (d.assistanceRequestId) return "/assistance-requests";

  // Type-based fallbacks
  const type = (n.type || "").toLowerCase();
  if (type.includes("task")) return "/tasks/all";
  if (type.includes("project")) return "/projects";
  if (type.includes("chat") || type.includes("message") || type.includes("comment")) {
    if (d.taskId) return `/task-details/${d.taskId}`;
    return "/notifications";
  }
  if (type.includes("invite")) return "/team-management";
  if (type.includes("access")) return "/workspace-access";
  if (type.includes("assistance")) return "/assistance-requests";
  if (type === "welcome") return "/dashboard";

  return "/notifications";
}
