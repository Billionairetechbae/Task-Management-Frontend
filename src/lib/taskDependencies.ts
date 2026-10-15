import type { TaskMutationWarning } from "@/lib/api";

export const BLOCKED_WARNING_CODE = "BLOCKED_BY_INCOMPLETE_DEPENDENCIES";

/** Human text for the advisory returned after a blocked task was moved. Null when there is nothing to say. */
export function dependencyWarningMessage(warnings?: TaskMutationWarning[] | null): string | null {
  const warning = warnings?.find((w) => w.code === BLOCKED_WARNING_CODE);
  if (!warning) return null;
  const count = Math.max(1, Number(warning.count ?? 1));
  return `Moved, but ${count} ${count === 1 ? "dependency is" : "dependencies are"} unfinished.`;
}

export function blockedCount(task: { isBlocked?: boolean | null; unresolvedDependencyCount?: number | null } | null | undefined): number {
  return task?.isBlocked ? Math.max(1, Number(task.unresolvedDependencyCount ?? 1)) : 0;
}
