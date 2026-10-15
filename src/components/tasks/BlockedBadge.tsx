import { Lock } from "lucide-react";
import { blockedCount } from "@/lib/taskDependencies";

type Props = {
  task: { isBlocked?: boolean | null; unresolvedDependencyCount?: number | null } | null | undefined;
  className?: string;
};

/** "Blocked · N" chip shared by the Board, task lists and the Calendar. Renders nothing for unblocked tasks. */
export default function BlockedBadge({ task, className = "" }: Props) {
  const count = blockedCount(task);
  if (!count) return null;
  return (
    <span
      data-testid="blocked-badge"
      title={`Waiting on ${count} unfinished ${count === 1 ? "dependency" : "dependencies"}`}
      className={`inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200 ${className}`}
    >
      <Lock size={11} aria-hidden="true" />
      Blocked · {count}
    </span>
  );
}
