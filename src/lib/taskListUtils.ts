import type { Task, TaskWatcher } from "@/lib/api";

/** True when the task is a top-level task (not a subtask row). */
export function isTopLevelTask(task: { parentTaskId?: string | null }): boolean {
  const id = task.parentTaskId;
  return id == null || id === "";
}

/** Keep only tasks without a parent — list/table views should not show subtasks as standalone rows. */
export function filterTopLevelTasks<T extends { parentTaskId?: string | null }>(
  tasks: T[] | undefined | null
): T[] {
  if (!tasks?.length) return [];
  return tasks.filter(isTopLevelTask);
}

/** True when the user is directly involved in the task: creator, primary assignee, or in multi-assignees. */
export function isUserInvolvedInTask(
  task: Task | null | undefined,
  userId?: string | null
): boolean {
  if (!task || !userId) return false;
  if (task.creator?.id && task.creator.id === userId) return true;
  if (task.assigneeId && task.assigneeId === userId) return true;
  if (task.assignee?.id && task.assignee.id === userId) return true;
  if (task.assignedAssistantId === userId || task.executiveId === userId) return true;
  return Array.isArray(task.assignees)
    ? task.assignees.some((a: any) => a?.id === userId || a?.user?.id === userId)
    : false;
}

/**
 * List-level read-only hint for badges/disabled row actions.
 * Prefers the backend-provided `task.access`; otherwise infers from
 * involvement — tasks the user is not part of are read-only.
 * GET /tasks/:id remains the final authority for the detail page.
 */
export function isTaskReadOnlyForUser(
  task: Task | null | undefined,
  userId?: string | null
): boolean {
  if (!task) return false;
  if (task.access) {
    return task.access.readOnly === true || task.access.canEdit === false;
  }
  return !isUserInvolvedInTask(task, userId);
}

type SubtaskCountable = {
  subtaskCount?: number;
  subtasks?: unknown[] | null;
};

/** Prefer backend `subtaskCount`, then `subtasks.length`. */
export function getTaskSubtaskCount(task: SubtaskCountable | null | undefined): number {
  if (!task) return 0;
  if (typeof task.subtaskCount === "number") return task.subtaskCount;
  const arr = task.subtasks;
  return Array.isArray(arr) ? arr.length : 0;
}

type WatcherCountable = {
  watcherCount?: number;
  watchers?: TaskWatcher[] | null;
  recentWatchers?: TaskWatcher[] | null;
};

/** Prefer backend `watcherCount`, then `watchers` / `recentWatchers` length. */
export function getTaskWatcherCount(task: WatcherCountable | null | undefined): number {
  if (!task) return 0;
  if (typeof task.watcherCount === "number") return task.watcherCount;
  const list = task.watchers ?? task.recentWatchers;
  return Array.isArray(list) ? list.length : 0;
}
