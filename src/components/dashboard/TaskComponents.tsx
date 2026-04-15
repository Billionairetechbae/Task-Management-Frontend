import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Eye, Pencil, UserPlus, Trash2, Bell, GitBranch, ListTodo,
} from "lucide-react";
import { Task } from "@/lib/api";
import CompanyBadge from "@/components/CompanyBadge";
import { cn } from "@/lib/utils";

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
  const m: Record<string, string> = { pending: "Pending", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };
  return m[status] || status;
};

export const getPriorityDisplay = (priority: string) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "completed": return "bg-success/10 text-success border-success/20";
    case "in_progress": case "active": return "bg-primary/10 text-primary border-primary/20";
    case "pending": case "planning": return "bg-warning/10 text-warning border-warning/20";
    case "on_hold": return "bg-info/10 text-info border-info/20";
    case "cancelled": return "bg-muted text-muted-foreground";
    default: return "bg-secondary text-secondary-foreground";
  }
};

export const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case "high": case "urgent": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium": return "bg-warning/10 text-warning border-warning/20";
    case "low": return "bg-info/10 text-info border-info/20";
    default: return "bg-secondary text-secondary-foreground";
  }
};

const getSubtaskCount = (task: Task) =>
  typeof task.subtaskCount === "number" ? task.subtaskCount : task.subtasks?.length || 0;

const ActionButton = ({ icon: Icon, label, onClick, variant = "ghost", className: extraClass }: {
  icon: typeof Eye; label: string; onClick?: () => void;
  variant?: "ghost" | "outline"; className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant={variant} size="icon" className={cn("h-7 w-7 transition-all duration-200", extraClass)} onClick={onClick}>
        <Icon className="h-3.5 w-3.5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
  </Tooltip>
);

export const TaskTable = ({ tasks, showAssignee = true, showExecutive = false, showActions = false, onEdit, onAssign, onDelete }: TaskTableProps) => (
  <TooltipProvider delayDuration={100}>
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Desktop header */}
      <div className="hidden lg:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Task</div>
        {showAssignee && <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Assignee</div>}
        {showExecutive && <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Executive</div>}
        <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Priority</div>
        <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Deadline</div>
        <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Status</div>
        <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">Actions</div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-border">
        {tasks.map((task) => (
          <div key={task.id} className="p-3.5 space-y-2.5 hover:bg-muted/20 transition-colors duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CompanyBadge company={task.company} />
                  <h4 className="font-semibold text-sm truncate">{task.title}</h4>
                </div>
                {task.description && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  {!!task.parentTaskId && <span className="inline-flex items-center gap-1"><GitBranch className="w-3 h-3" />Subtask</span>}
                  <span className="inline-flex items-center gap-1"><ListTodo className="w-3 h-3" />{getSubtaskCount(task)}</span>
                  <span className="inline-flex items-center gap-1"><Bell className="w-3 h-3" />{task.watcherCount || 0}</span>
                </div>
              </div>
              <Badge className={cn("text-[10px] shrink-0", getStatusBadgeClass(task.status))}>{getStatusDisplay(task.status)}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className={cn("text-[10px]", getPriorityBadgeClass(task.priority))}>{getPriorityDisplay(task.priority)}</Badge>
              <span className="text-muted-foreground">Due: {new Date(task.deadline).toLocaleDateString()}</span>
              {showAssignee && task.assignee && <span className="text-muted-foreground">→ {task.assignee.firstName} {task.assignee.lastName}</span>}
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px]" asChild>
                <Link to={`/task-details/${task.id}`}><Eye className="h-3 w-3 mr-1" /> View</Link>
              </Button>
              {showActions && onEdit && <ActionButton icon={Pencil} label="Edit" onClick={() => onEdit(task)} variant="outline" />}
              {showActions && onAssign && <ActionButton icon={UserPlus} label="Assign" onClick={() => onAssign(task)} variant="outline" />}
              {showActions && onDelete && <ActionButton icon={Trash2} label="Delete" onClick={() => onDelete(task)} variant="outline" className="text-destructive hover:text-destructive" />}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop rows */}
      <div className="hidden lg:block divide-y divide-border">
        {tasks.map((task) => (
          <div key={task.id} className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-3 px-4 py-2 items-center hover:bg-muted/20 transition-colors duration-150">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CompanyBadge company={task.company} />
                <p className="font-medium text-[13px] truncate">{task.title}</p>
              </div>
              {task.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{task.description}</p>}
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {!!task.parentTaskId && <span className="inline-flex items-center gap-1"><GitBranch className="w-3 h-3" />Subtask</span>}
                <span className="inline-flex items-center gap-1"><ListTodo className="w-3 h-3" />{getSubtaskCount(task)}</span>
                <span className="inline-flex items-center gap-1"><Bell className="w-3 h-3" />{task.watcherCount || 0}</span>
              </div>
            </div>
            {showAssignee && (
              <div className="text-[13px] text-muted-foreground truncate">
                {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : <span className="text-muted-foreground/40 italic text-[11px]">Unassigned</span>}
              </div>
            )}
            {showExecutive && (
              <div className="text-[13px] text-muted-foreground truncate">
                {task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : "—"}
              </div>
            )}
            <div><Badge className={cn("text-[10px]", getPriorityBadgeClass(task.priority))}>{getPriorityDisplay(task.priority)}</Badge></div>
            <div className="text-[12px] text-muted-foreground">{new Date(task.deadline).toLocaleDateString()}</div>
            <div><Badge className={cn("text-[10px]", getStatusBadgeClass(task.status))}>{getStatusDisplay(task.status)}</Badge></div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link to={`/task-details/${task.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">View</TooltipContent>
              </Tooltip>
              {showActions && onEdit && <ActionButton icon={Pencil} label="Edit" onClick={() => onEdit(task)} />}
              {showActions && onAssign && <ActionButton icon={UserPlus} label="Assign" onClick={() => onAssign(task)} />}
              {showActions && onDelete && <ActionButton icon={Trash2} label="Delete" onClick={() => onDelete(task)} className="text-destructive hover:text-destructive" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  </TooltipProvider>
);

export const CompactTaskTable = ({ tasks, onEdit }: { tasks: Task[]; onEdit?: (task: Task) => void }) => (
  <TooltipProvider delayDuration={100}>
    <div className="space-y-1">
      {tasks.map((task) => (
        <div key={task.id} className="group flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-muted/20 transition-all duration-150 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("w-2 h-2 rounded-full shrink-0",
                  task.status === "completed" ? "bg-success" : task.status === "in_progress" ? "bg-primary" : "bg-warning"
                )} />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">{getStatusDisplay(task.status)}</TooltipContent>
            </Tooltip>
            <div className="min-w-0 flex flex-col">
              <span className="font-semibold truncate text-foreground leading-tight text-[12px]">{task.title}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn("text-[8px] px-1 h-3.5 uppercase font-bold", getPriorityBadgeClass(task.priority))}>{task.priority}</Badge>
                {task.deadline && <span className="text-[9px] text-muted-foreground">Due {new Date(task.deadline).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                  <Link to={`/task-details/${task.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">View</TooltipContent>
            </Tooltip>
            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(task)}><Pencil className="h-3.5 w-3.5" /></Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Edit</TooltipContent>
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

export const Pagination = ({ currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startIndex + 1}–{Math.min(endIndex, totalItems)}</span> of{" "}
          <span className="font-medium text-foreground">{totalItems}</span>
        </p>
        <div className="flex items-center gap-1">
          <Tooltip><TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(1)} disabled={currentPage === 1}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent className="text-xs">First</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent className="text-xs">Previous</TooltipContent></Tooltip>
          <div className="flex items-center gap-0.5 mx-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => onPageChange(pageNum)}>
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent className="text-xs">Next</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-3.5 w-3.5" /></Button>
          </TooltipTrigger><TooltipContent className="text-xs">Last</TooltipContent></Tooltip>
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
    <div className="flex gap-0.5 border-b border-border overflow-x-auto pb-px scrollbar-none">
      {statuses.map((s) => (
        <button
          key={s.value}
          onClick={() => onStatusChange(s.value)}
          className={cn(
            "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200",
            statusFilter === s.value
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};
