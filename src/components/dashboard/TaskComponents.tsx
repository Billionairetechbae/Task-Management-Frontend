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
} from "lucide-react";
import { Task } from "@/lib/api";
import CompanyBadge from "@/components/CompanyBadge";
import { cn } from "@/lib/utils";
import { getTaskSubtaskCount, getTaskWatcherCount } from "@/lib/taskListUtils";

interface TaskTableProps {
  tasks: Task[];
  showAssignee?: boolean;
  showExecutive?: boolean;
  showActions?: boolean;
  onEdit?: (task: Task) => void;
  onAssign?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export const getStatusDisplay = (status: string) => {
  const m: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return m[status] || status;
};

export const getPriorityDisplay = (priority: string) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "in_progress":
    case "active":
      return "bg-primary/10 text-primary border-primary/20";
    case "pending":
    case "planning":
      return "bg-warning/10 text-warning border-warning/20";
    case "on_hold":
      return "bg-info/10 text-info border-info/20";
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
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium":
      return "bg-warning/10 text-warning border-warning/20";
    case "low":
      return "bg-info/10 text-info border-info/20";
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
}: {
  icon: typeof Eye;
  label: string;
  onClick?: () => void;
  variant?: "ghost" | "outline";
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={variant}
        size="icon"
        className={cn("h-7 w-7 transition-all duration-200", extraClass)}
        onClick={onClick}
      >
        <Icon className="h-3.5 w-3.5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">
      {label}
    </TooltipContent>
  </Tooltip>
);

export const TaskTable = ({
  tasks,
  showAssignee = true,
  showExecutive = false,
  showActions = false,
  onEdit,
  onAssign,
  onDelete,
}: TaskTableProps) => (
  <TooltipProvider delayDuration={100}>
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[26%]">
                Task
              </th>
              {showAssignee && (
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[14%]">
                  Assignee
                </th>
              )}
              {showExecutive && (
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[14%]">
                  Executive
                </th>
              )}
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[10%]">
                Priority
              </th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[12%]">
                Deadline
              </th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[12%] text-right">
                Actions
              </th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-[12%]">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors duration-150 align-middle"
              >
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CompanyBadge company={task.company} />
                      <p className="truncate text-[13px] font-medium">{task.title}</p>
                    </div>

                    {task.description && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
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
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
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
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    <div className="truncate">
                      {task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : "—"}
                    </div>
                  </td>
                )}

                <td className="px-4 py-3">
                  <Badge className={cn("text-[10px]", getPriorityBadgeClass(task.priority))}>
                    {getPriorityDisplay(task.priority)}
                  </Badge>
                </td>

                <td className="px-4 py-3 text-[12px] text-muted-foreground">
                  {new Date(task.deadline).toLocaleDateString()}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link to={`/task-details/${task.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        View
                      </TooltipContent>
                    </Tooltip>

                    {showActions && onEdit && (
                      <ActionButton icon={Pencil} label="Edit" onClick={() => onEdit(task)} />
                    )}
                    {showActions && onAssign && (
                      <ActionButton icon={UserPlus} label="Assign" onClick={() => onAssign(task)} />
                    )}
                    {showActions && onDelete && (
                      <ActionButton
                        icon={Trash2}
                        label="Delete"
                        onClick={() => onDelete(task)}
                        className="text-destructive hover:text-destructive"
                      />
                    )}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <Badge className={cn("text-[10px]", getStatusBadgeClass(task.status))}>
                    {getStatusDisplay(task.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border lg:hidden">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="space-y-3 px-3.5 py-3 transition-colors duration-150 hover:bg-muted/20 sm:px-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CompanyBadge company={task.company} />
                  <h4 className="truncate text-sm font-semibold">{task.title}</h4>
                </div>

                {task.description && (
                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    {task.description}
                  </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
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

              <Badge className={cn("shrink-0 text-[10px]", getStatusBadgeClass(task.status))}>
                {getStatusDisplay(task.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              {showAssignee && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide">Assignee</p>
                  <p className="truncate">
                    {task.assignee
                      ? `${task.assignee.firstName} ${task.assignee.lastName}`
                      : "Unassigned"}
                  </p>
                </div>
              )}

              {showExecutive && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide">Executive</p>
                  <p className="truncate">
                    {task.creator
                      ? `${task.creator.firstName} ${task.creator.lastName}`
                      : "—"}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-wide">Priority</p>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", getPriorityBadgeClass(task.priority))}
                  >
                    {getPriorityDisplay(task.priority)}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide">Deadline</p>
                <p>{new Date(task.deadline).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/task-details/${task.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  View
                </TooltipContent>
              </Tooltip>

              {showActions && onEdit && (
                <ActionButton icon={Pencil} label="Edit" onClick={() => onEdit(task)} />
              )}
              {showActions && onAssign && (
                <ActionButton icon={UserPlus} label="Assign" onClick={() => onAssign(task)} />
              )}
              {showActions && onDelete && (
                <ActionButton
                  icon={Trash2}
                  label="Delete"
                  onClick={() => onDelete(task)}
                  className="text-destructive hover:text-destructive"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </TooltipProvider>
);

export const CompactTaskTable = ({
  tasks,
  onEdit,
}: {
  tasks: Task[];
  onEdit?: (task: Task) => void;
}) => (
  <TooltipProvider delayDuration={100}>
    <div className="space-y-1.5">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-xs transition-all duration-150 hover:bg-muted/20"
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
              <TooltipContent side="top" className="text-[10px]">
                {getStatusDisplay(task.status)}
              </TooltipContent>
            </Tooltip>

            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-tight text-foreground">
                {task.title}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-4 px-1 text-[8px] font-bold uppercase",
                    getPriorityBadgeClass(task.priority)
                  )}
                >
                  {task.priority}
                </Badge>
                {task.deadline && (
                  <span className="text-[10px] text-muted-foreground">
                    Due {new Date(task.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link to={`/task-details/${task.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                View
              </TooltipContent>
            </Tooltip>

            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(task)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">
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
              <Button
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
              <Button
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
              <Button
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
              <Button
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
                ? "border-primary text-primary"
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