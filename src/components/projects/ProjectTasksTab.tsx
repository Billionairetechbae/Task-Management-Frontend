import { useState } from "react";
import { Task } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Calendar, ClipboardList, Eye, Plus, User } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProjectTasksTabProps {
  tasks: Task[];
  loading: boolean;
  onAddTask: () => void;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/15 text-info",
  high: "bg-warning/15 text-warning",
  urgent: "bg-destructive/15 text-destructive",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-info/15 text-info",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const ProjectTasksTab = ({ tasks, loading, onAddTask }: ProjectTasksTabProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="shadow-soft animate-fade-in">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No tasks yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">Create your first task to start tracking work in this project.</p>
          <Button onClick={onAddTask} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Task
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={onAddTask}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Task
        </Button>
      </div>

      {tasks.map((task, idx) => (
        <Card
          key={task.id}
          className={cn(
            "p-4 shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group border border-border hover:border-primary/20",
          )}
          style={{ animationDelay: `${idx * 40}ms` }}
          onClick={() => navigate(`/task-details/${task.id}`)}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusColors[task.status])}>
                  {task.status.replace("_", " ")}
                </Badge>
                {task.priority && (
                  <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}>
                    {task.priority}
                  </Badge>
                )}
                {task.deadline && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.deadline), "MMM d")}
                  </span>
                )}
              </div>
            </div>

            {task.assignee && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{task.assignee.firstName} {task.assignee.lastName}</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View task</TooltipContent>
            </Tooltip>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ProjectTasksTab;
