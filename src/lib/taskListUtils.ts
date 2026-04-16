import type { TaskWatcher } from "@/lib/api";

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

type SubtaskCountable = {
  subtaskCount?: number;
  subtasks?: unknown[] | null;
};

/** Prefer backend `subtaskCount`, then `subtasks.length`. */
export function getTaskSubtaskCount(task: SubtaskCountable): number {
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
export function getTaskWatcherCount(task: WatcherCountable): number {
  if (typeof task.watcherCount === "number") return task.watcherCount;
  const list = task.watchers ?? task.recentWatchers;
  return Array.isArray(list) ? list.length : 0;
}
