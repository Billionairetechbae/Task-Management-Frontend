import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Pencil,
  UserPlus,
  Trash2,
  Bell,
  ListTodo,
  Lock,
} from "lucide-react";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { Task, api } from "@/lib/api";
import CompanyBadge from "@/components/CompanyBadge";
import { cn } from "@/lib/utils";
import { getTaskSubtaskCount, getTaskWatcherCount, isTaskReadOnlyForUser } from "@/lib/taskListUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BlockedBadge from "@/components/tasks/BlockedBadge";
import RepeatBadge from "@/components/tasks/RepeatBadge";
import { dependencyWarningMessage } from "@/lib/taskDependencies";
import ProjectBadge from "@/components/projects/ProjectBadge";

interface TaskTableProps {
  tasks: Task[];
  customFieldColumns?: { id: string; name: string }[];
  showAssignee?: boolean;
  showExecutive?: boolean;
  showActions?: boolean;
  onEdit?: (task: Task) => void;
  onView?: (task: Task) => void;
  onAssign?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  /** Optional per-row permission predicates. When provided and returning false, the corresponding action button renders disabled. */
  canView?: (task: Task) => boolean;
  canEdit?: (task: Task) => boolean;
  canAssign?: (task: Task) => boolean;
  canDelete?: (task: Task) => boolean;
}

export const formatTaskDeadline = (value: string | Date | null | undefined): string => {
  if ((typeof value !== "string" && !(value instanceof Date)) ||
      (typeof value === "string" && value.trim() === "")) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export const getStatusDisplay = (status: string) => {
  const m: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    delayed: "Delayed",
    cancelled: "Cancelled",
    in_review: "In Review",
  };
  // Unknown statuses are shown readably rather than as a raw key.
  return m[status] || String(status ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export const getPriorityDisplay = (priority: string) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success-text border-success/20";
    case "in_progress":
    case "active":
      return "bg-primary/10 text-primary-text border-primary/20";
    case "pending":
    case "planning":
      return "bg-warning/10 text-warning-text border-warning/20";
    case "delayed":
      return "bg-destructive/10 text-destructive-text border-destructive/20";
    case "on_hold":
      return "bg-info/10 text-info-text border-info/20";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
};

export const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case "high":
    case "urgent":
      return "bg-destructive/10 text-destructive-text border-destructive/20";
    case "medium":
      return "bg-warning/10 text-warning-text border-warning/20";
    case "low":
      return "bg-info/10 text-info-text border-info/20";
    default:
      return "bg-secondary text-secondary-foreground";
  }
};

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "ghost",
  className: extraClass,
  disabled,
  disabledReason,
}: {
  icon: typeof Eye;
  label: string;
  onClick?: () => void;
  variant?: "ghost" | "outline";
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span>
        <Button
          variant={variant}
          size="icon"
          className={cn("h-8 w-8 shrink-0 transition-all duration-200", extraClass)}
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          disabled={disabled}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">
      {disabled && disabledReason ? disabledReason : label}
    </TooltipContent>
  </Tooltip>
);

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
  { value: "cancelled", label: "Cancelled" },
];

export const InlineStatusSelect = ({
  task,
  onChanged,
  size = "sm",
}: {
  task: Task;
  onChanged?: (taskId: string, status: string) => void;
  size?: "sm" | "xs";
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [value, setValue] = useState<string>(task.status as string);
  const [saving, setSaving] = useState(false);

  // Permission: assignees, creator, or privileged roles
  const isAssignee =
    task.assigneeId === user?.id ||
    (Array.isArray((task as any).assignees) &&
      (task as any).assignees.some((a: any) => a?.id === user?.id));
  const isCreator = (task as any).createdBy === user?.id || (task as any).creator?.id === user?.id;
  const isPrivileged =
    user?.role === "admin" || user?.role === "executive" || user?.role === "manager";
  const canChange = isPrivileged || isCreator || isAssignee;

  if (!canChange) {
    return (
      <Badge className={cn("text-[0.625rem]", getStatusBadgeClass(task.status))}>
        {getStatusDisplay(task.status)}
      </Badge>
    );
  }

  const handleChange = async (next: string) => {
    if (next === value) return;
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      let warning: string | null = null;
      if (isPrivileged || isCreator) {
        const res = await api.updateTask(task.id, { status: next as any });
        warning = dependencyWarningMessage(res?.warnings);
      } else {
        await api.updateTaskProgress(task.id, { status: next });
      }
      toast({ title: "Status updated", description: warning || `Task is now ${getStatusDisplay(next)}.` });
      onChanged?.(task.id, next);
    } catch (e: any) {
      setValue(prev);
      toast({
        title: "Could not update status",
        description: e?.message || "Try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select value={value} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger
        className={cn(
          "h-auto min-h-7 px-2 py-1 text-[0.625rem] font-medium border w-full min-w-[6.5rem] max-w-[9rem]",
          getStatusBadgeClass(value),
          size === "xs" && "min-h-6 text-[0.625rem] max-w-[8rem]"
        )}
        aria-label={`Status: ${getStatusDisplay(value)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
        {/* A status this control cannot set (e.g. in review) must still be displayed, not render a blank trigger. */}
        {value && !STATUS_OPTIONS.some((o) => o.value === value) && (
          <SelectItem value={value} disabled className="text-xs">{getStatusDisplay(value)}</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export const TaskTable = ({
  tasks,
  customFieldColumns = [],
  showAssignee = true,
  showExecutive = false,
  showActions = false,
  onEdit,
  onView,
  onAssign,
  onDelete,
  onStatusChange,
  canView,
  canEdit,
  canAssign,
  canDelete,
}: TaskTableProps) => {
  const { user } = useAuth();
  return (
  <TooltipProvider delayDuration={100}>
    <div className="rl-table overflow-hidden rounded-xl border border-border bg-card">
      {/* Table: shown when the table's own container is wide enough (container query), otherwise the card list below. */}
      <div className="rl-table__wide rl-scroll-x" role="region" aria-label="Tasks table" tabIndex={0}>
        <table className="w-full min-w-[60rem] table-fixed border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <th scope="col" className="px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                Task
              </th>
              {showAssignee && (
                <th scope="col" className="px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground w-[8.5rem]">
                  Assignee
                </th>
              )}
              {showExecutive && (
                <th scope="col" className="px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground w-[8.5rem]">
                  Executive
                </th>
              )}
              {customFieldColumns.map((field) => <th scope="col" key={field.id} className="w-[8rem] px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">{field.name}</th>)}
              <th scope="col" className="px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground w-[6rem]">
                Priority
              </th>
              <th scope="col" className="px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground w-[7.5rem]">
                Deadline
              </th>
              <th scope="col" className="px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground w-[9rem]">
                Status
              </th>
              <th scope="col" className="px-3 py-3 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground w-[9.5rem] text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors duration-150 align-middle cursor-pointer"
                onClick={() => {
                  if (onView) {
                    onView(task);
                  } else {
                    window.location.href = `/task-details/${task.id}`;
                  }
                }}
              >
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CompanyBadge company={task.company} />
                      <p className="min-w-0 flex-1 break-words text-[0.8125rem] font-medium line-clamp-2" title={task.title || undefined}>{task.title}</p>
                      <BlockedBadge task={task} />
                      <RepeatBadge task={task} />
                      {isTaskReadOnlyForUser(task, user?.id) && (
                        <Badge
                          variant="outline"
                          title="You can view this task but not modify it"
                          className="shrink-0 inline-flex items-center gap-1 text-[0.5625rem] font-medium text-muted-foreground border-border bg-muted/40"
                        >
                          <Lock className="h-2.5 w-2.5" /> Read only
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    {task.project && <div className="mt-1"><ProjectBadge project={task.project} /></div>}

                    {task.team && (
                      <p className="mt-1 truncate text-[0.625rem] font-medium text-primary-text">
                        Team: {task.team.name}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.625rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ListTodo className="h-3 w-3" />
                        {getTaskSubtaskCount(task)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        {getTaskWatcherCount(task)}
                      </span>
                    </div>
                  </div>
                </td>

                {showAssignee && (
                  <td className="px-4 py-3 text-[0.75rem] text-muted-foreground">
                    <div className="truncate">
                      {task.assignee ? (
                        `${task.assignee.firstName} ${task.assignee.lastName}`
                      ) : (
                        <span className="italic text-muted-foreground/50">Unassigned</span>
                      )}
                    </div>
                  </td>
                )}

                {showExecutive && (
                  <td className="px-4 py-3 text-[0.75rem] text-muted-foreground">
                    <div className="truncate">
                      {task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : "—"}
                    </div>
                  </td>
                )}
                {customFieldColumns.map((field) => <td key={field.id} className="px-3 py-3 text-xs text-muted-foreground"><span className="block truncate">{(task as any).customFieldColumns?.[field.id] ?? "—"}</span></td>)}

                <td className="px-4 py-3">
                  <Badge className={cn("text-[0.625rem]", getPriorityBadgeClass(task.priority))}>
                    {getPriorityDisplay(task.priority)}
                  </Badge>
                </td>

                <td className="px-4 py-3 text-[0.75rem] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{formatTaskDeadline(task.deadline)}</span>
                    {task.calendarSynced ? (
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                    ) : null}
                  </div>
                </td>

                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <InlineStatusSelect task={task} onChanged={onStatusChange} />
                </td>

                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 shrink-0" 
                          aria-label="View"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onView) {
                              onView(task);
                            } else {
                              window.location.href = `/task-details/${task.id}`;
                            }
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        View
                      </TooltipContent>
                    </Tooltip>

                    {showActions && onEdit && (
                      <ActionButton
                        icon={Pencil}
                        label="Edit"
                        onClick={() => onEdit(task)}
                        disabled={isTaskReadOnlyForUser(task, user?.id) || (canEdit ? !canEdit(task) : false)}
                        disabledReason="You don't have permission to edit this task"
                      />
                    )}
                    {showActions && onAssign && (
                      <ActionButton
                        icon={UserPlus}
                        label="Assign"
                        onClick={() => onAssign(task)}
                        disabled={isTaskReadOnlyForUser(task, user?.id) || (canAssign ? !canAssign(task) : false)}
                        disabledReason="You don't have permission to assign this task"
                      />
                    )}
                    {showActions && onDelete && (
                      <ActionButton
                        icon={Trash2}
                        label="Delete"
                        onClick={() => onDelete(task)}
                        className="text-destructive-text hover:text-destructive-text"
                        disabled={isTaskReadOnlyForUser(task, user?.id) || (canDelete ? !canDelete(task) : false)}
                        disabledReason="You don't have permission to delete this task"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="rl-table__cards divide-y divide-border">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="space-y-3 px-3.5 py-3 transition-colors duration-150 hover:bg-muted/20 sm:px-4 cursor-pointer"
            onClick={() => {
              if (onView) {
                onView(task);
              } else {
                window.location.href = `/task-details/${task.id}`;
              }
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="min-w-[min(100%,12rem)] flex-1">
                <div className="flex items-center gap-2">
                  <CompanyBadge company={task.company} />
                  <h4 className="truncate text-sm font-semibold">{task.title}</h4>
                  <BlockedBadge task={task} />
                  {isTaskReadOnlyForUser(task, user?.id) && (
                    <Badge
                      variant="outline"
                      title="You can view this task but not modify it"
                      className="shrink-0 inline-flex items-center gap-1 text-[0.5625rem] font-medium text-muted-foreground border-border bg-muted/40"
                    >
                      <Lock className="h-2.5 w-2.5" /> Read only
                    </Badge>
                  )}
                </div>

                {task.description && (
                  <p className="mt-1 line-clamp-1 text-[0.6875rem] text-muted-foreground">
                    {task.description}
                  </p>
                )}

                {task.project && <div className="mt-1"><ProjectBadge project={task.project} /></div>}

                {task.team && (
                  <p className="mt-1 truncate text-[0.625rem] font-medium text-primary-text">
                    Team: {task.team.name}
                  </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.625rem] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ListTodo className="h-3 w-3" />
                    {getTaskSubtaskCount(task)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    {getTaskWatcherCount(task)}
                  </span>
                </div>
              </div>

              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <InlineStatusSelect task={task} onChanged={onStatusChange} size="xs" />
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7.5rem),1fr))] gap-2 text-xs text-muted-foreground">
              {showAssignee && (
                <div className="min-w-0">
                  <p className="text-[0.625rem] uppercase tracking-wide">Assignee</p>
                  <p className="truncate">
                    {task.assignee
                      ? `${task.assignee.firstName} ${task.assignee.lastName}`
                      : "Unassigned"}
                  </p>
                </div>
              )}

              {showExecutive && (
                <div className="min-w-0">
                  <p className="text-[0.625rem] uppercase tracking-wide">Executive</p>
                  <p className="truncate">
                    {task.creator
                      ? `${task.creator.firstName} ${task.creator.lastName}`
                      : "—"}
                  </p>
                </div>
              )}
              {customFieldColumns.map((field) => <div key={field.id} className="min-w-0"><p className="text-[0.625rem] uppercase tracking-wide">{field.name}</p><p className="truncate">{(task as any).customFieldColumns?.[field.id] ?? "—"}</p></div>)}

              <div className="min-w-0">
                <p className="text-[0.625rem] uppercase tracking-wide">Priority</p>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={cn("text-[0.625rem]", getPriorityBadgeClass(task.priority))}
                  >
                    {getPriorityDisplay(task.priority)}
                  </Badge>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[0.625rem] uppercase tracking-wide">Deadline</p>
                <div className="flex items-center gap-1">
                  <p className="[overflow-wrap:anywhere]">{formatTaskDeadline(task.deadline)}</p>
                  {task.calendarSynced ? <Calendar className="w-3 h-3 text-muted-foreground" /> : null}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button aria-label="View" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onView) {
                      onView(task);
                    } else {
                      window.location.href = `/task-details/${task.id}`;
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  View
                </TooltipContent>
              </Tooltip>

              {showActions && onEdit && (
                <ActionButton
                  icon={Pencil}
                  label="Edit"
                  onClick={() => onEdit(task)}
                  disabled={isTaskReadOnlyForUser(task, user?.id) || (canEdit ? !canEdit(task) : false)}
                  disabledReason="You don't have permission to edit this task"
                />
              )}
              {showActions && onAssign && (
                <ActionButton
                  icon={UserPlus}
                  label="Assign"
                  onClick={() => onAssign(task)}
                  disabled={isTaskReadOnlyForUser(task, user?.id) || (canAssign ? !canAssign(task) : false)}
                  disabledReason="You don't have permission to assign this task"
                />
              )}
              {showActions && onDelete && (
                <ActionButton
                  icon={Trash2}
                  label="Delete"
                  onClick={() => onDelete(task)}
                  className="text-destructive-text hover:text-destructive-text"
                  disabled={isTaskReadOnlyForUser(task, user?.id) || (canDelete ? !canDelete(task) : false)}
                  disabledReason="You don't have permission to delete this task"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </TooltipProvider>
  );
};

export const CompactTaskTable = ({
  tasks,
  onEdit,
  onView,
}: {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onView?: (task: Task) => void;
}) => (
  <TooltipProvider delayDuration={100}>
    <div className="space-y-1.5">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-xs transition-all duration-150 hover:bg-muted/20 cursor-pointer"
          onClick={() => {
            if (onView) {
              onView(task);
            } else {
              window.location.href = `/task-details/${task.id}`;
            }
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    task.status === "completed"
                      ? "bg-success"
                      : task.status === "in_progress"
                      ? "bg-primary"
                      : "bg-warning"
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[0.625rem]">
                {getStatusDisplay(task.status)}
              </TooltipContent>
            </Tooltip>

            <div className="min-w-0">
              <p className="truncate text-[0.75rem] font-semibold leading-tight text-foreground">
                {task.title}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-4 px-1 text-[0.5rem] font-bold uppercase",
                    getPriorityBadgeClass(task.priority)
                  )}
                >
                  {task.priority}
                </Badge>
                {task.deadline && (
                  <span className="text-[0.625rem] text-muted-foreground inline-flex items-center gap-1">
                    Due {formatTaskDeadline(task.deadline)}
                    {task.calendarSynced ? <Calendar className="w-3 h-3 text-muted-foreground" /> : null}
                  </span>
                )}
                {task.project && <ProjectBadge project={task.project} />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="View" 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onView) {
                    onView(task);
                  } else {
                    window.location.href = `/task-details/${task.id}`;
                  }
                }}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[0.625rem]">
                View
              </TooltipContent>
            </Tooltip>

            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button aria-label="Edit"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[0.625rem]">
                  Edit
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      ))}
    </div>
  </TooltipProvider>
);

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {startIndex + 1}–{Math.min(endIndex, totalItems)}
          </span>{" "}
          of <span className="font-medium text-foreground">{totalItems}</span>
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label="First"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">First</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label="Previous"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Previous</TooltipContent>
          </Tooltip>

          <div className="mx-1 flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label="Next"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Next</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label="Last"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Last</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

interface TaskFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export const TaskFilters = ({ statusFilter, onStatusChange }: TaskFiltersProps) => {
  const statuses = [
    { value: "", label: "All Tasks" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "delayed", label: "Delayed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="overflow-x-auto border-b border-border pb-px">
      <div className="flex min-w-max gap-0.5">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-all duration-200",
              statusFilter === s.value
                ? "border-primary text-primary-text"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};
