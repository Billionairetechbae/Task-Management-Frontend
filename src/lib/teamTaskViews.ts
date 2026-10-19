import type { Task } from "@/lib/api";

/** Team task views. "all" is the default and never hides any status; "active" intentionally excludes completed and cancelled work. */
export type TeamTaskView = "all" | "active" | "in_review" | "completed" | "overdue";
export const TEAM_TASK_VIEWS: Array<[TeamTaskView, string]> = [["all", "All"], ["active", "Active"], ["in_review", "In Review"], ["completed", "Completed"], ["overdue", "Overdue"]];

const CLOSED = ["completed", "cancelled"];
export const isClosedStatus = (status?: string | null) => CLOSED.includes(status || "");
/** Overdue = due before the start of today (same rule the Team page has always used) and not closed. */
export const isTaskOverdue = (task: Pick<Task, "deadline" | "status">, now = Date.now()) =>
  !!task.deadline && new Date(task.deadline).getTime() < new Date(new Date(now).toDateString()).getTime() && !isClosedStatus(task.status);

export const taskMatchesView = (task: Pick<Task, "deadline" | "status">, view: TeamTaskView, now = Date.now()) => {
  if (view === "all") return true;
  if (view === "active") return !isClosedStatus(task.status);
  if (view === "overdue") return isTaskOverdue(task, now);
  return task.status === view;
};

export interface TeamTaskCounts { all: number; active: number; in_review: number; completed: number; overdue: number; cancelled?: number }

/** Counts for the view tabs. The server value (exact, uncapped) is preferred; the list-derived value is the fallback. */
export const countTeamTasks = (tasks: Array<Pick<Task, "deadline" | "status">>, server?: Partial<TeamTaskCounts> | null, now = Date.now()): TeamTaskCounts => {
  const local: TeamTaskCounts = {
    all: tasks.length,
    active: tasks.filter((t) => taskMatchesView(t, "active", now)).length,
    in_review: tasks.filter((t) => t.status === "in_review").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => isTaskOverdue(t, now)).length,
  };
  return server ? { ...local, ...Object.fromEntries(Object.entries(server).filter(([, v]) => typeof v === "number")) } as TeamTaskCounts : local;
};

/**
 * Combines every source of Team tasks by id, keeping the most recently updated copy of each. A task present in any source is never
 * dropped just because another source (e.g. an "active assignments" list) leaves out its later states.
 */
export const mergeTeamTasks = (...lists: Array<Task[] | undefined | null>): Task[] => {
  const byId = new Map<string, Task>();
  for (const list of lists) for (const task of list || []) {
    if (!task?.id || task.parentTaskId) continue;
    const existing = byId.get(task.id);
    const time = (t: Task) => new Date(t.updatedAt || t.createdAt || 0).getTime();
    if (!existing || time(task) >= time(existing)) byId.set(task.id, existing ? { ...existing, ...task } : task);
  }
  return [...byId.values()];
};
