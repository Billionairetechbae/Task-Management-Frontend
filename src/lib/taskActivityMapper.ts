import {
  Activity,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  FileX2,
  Link2,
  ListChecks,
  MessageSquarePlus,
  Pencil,
  UserMinus,
  UserPlus,
} from "lucide-react";

export type TaskActivityPresentation = {
  label: string;
  /** Optional secondary line. Never contains another task's title (activity stores ids only). */
  detail?: string;
  icon: any;
  toneClass: string;
};

const activityMap: Record<string, TaskActivityPresentation> = {
  task_created: { label: "Task created", icon: CheckCircle2, toneClass: "text-emerald-600" },
  status_changed: { label: "Status changed", icon: Activity, toneClass: "text-blue-600" },
  priority_changed: { label: "Priority changed", icon: Activity, toneClass: "text-orange-600" },
  deadline_changed: { label: "Deadline changed", icon: CalendarClock, toneClass: "text-amber-600" },
  task_updated: { label: "Task updated", icon: Pencil, toneClass: "text-slate-600" },
  assignee_added: { label: "Assignee added", icon: UserPlus, toneClass: "text-indigo-600" },
  assignee_removed: { label: "Assignee removed", icon: UserMinus, toneClass: "text-rose-600" },
  comment_added: { label: "Comment added", icon: MessageSquarePlus, toneClass: "text-cyan-600" },
  attachment_added: { label: "Attachment added", icon: FilePlus2, toneClass: "text-violet-600" },
  attachment_removed: { label: "Attachment removed", icon: FileX2, toneClass: "text-rose-600" },
  subtask_created: { label: "Subtask created", icon: ListChecks, toneClass: "text-emerald-600" },
  subtask_updated: { label: "Subtask updated", icon: ListChecks, toneClass: "text-blue-600" },
  subtask_deleted: { label: "Subtask deleted", icon: ListChecks, toneClass: "text-rose-600" },
};

const dependencyDetail = (actionType: string, metadata?: Record<string, any> | null) => {
  const added = actionType === "dependency_added";
  if (metadata?.direction === "blocks") return added ? "Another task now depends on this task" : "Another task no longer depends on this task";
  if (metadata?.direction === "depends_on") return added ? "This task now depends on another task" : "This task no longer depends on another task";
  return undefined;
};

export const getTaskActivityPresentation = (actionType?: string, metadata?: Record<string, any> | null): TaskActivityPresentation => {
  if (actionType === "dependency_added" || actionType === "dependency_removed") {
    return {
      label: actionType === "dependency_added" ? "Dependency added" : "Dependency removed",
      detail: dependencyDetail(actionType, metadata),
      icon: Link2,
      toneClass: actionType === "dependency_added" ? "text-indigo-600" : "text-rose-600",
    };
  }
  if (!actionType) {
    return { label: "Task activity", icon: Activity, toneClass: "text-muted-foreground" };
  }
  return (
    activityMap[actionType] || {
      label: actionType.split("_").join(" "),
      icon: Activity,
      toneClass: "text-muted-foreground",
    }
  );
};

export const stringifyActivityValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

