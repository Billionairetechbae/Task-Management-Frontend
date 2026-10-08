import type { Task } from "@/lib/api";

export const taskWorkbenchPath = (taskId: string) => `/task-details/${taskId}`;
export const teamTaskPath = (teamId: string, taskId: string) => `/teams/${teamId}/tasks/${taskId}`;
export const teamSubtaskPath = (teamId: string, taskId: string, subtaskId: string) => `${teamTaskPath(teamId, taskId)}/subtasks/${subtaskId}`;

/** Resolve a task according to the context that opened it; it never grants access. */
export function resolveTaskPath(task: Pick<Task, "id" | "teamId" | "parentTaskId">, context: "workbench" | "team" = "workbench"): string {
  const id = task.id || "";
  if (task.parentTaskId && task.teamId) return teamSubtaskPath(task.teamId, task.parentTaskId, id);
  if (context === "team" && task.teamId) return teamTaskPath(task.teamId, id);
  return taskWorkbenchPath(id);
}
