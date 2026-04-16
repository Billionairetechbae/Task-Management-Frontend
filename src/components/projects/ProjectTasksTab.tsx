import { useState, useEffect } from "react";
import { Task, api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Calendar, ClipboardList, Eye, Plus, User } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { TaskTable, getStatusBadgeClass, CompactTaskTable } from "@/components/dashboard/TaskComponents";
import { EmptyState } from "@/components/dashboard/DashboardComponents";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { filterTopLevelTasks, getTaskSubtaskCount, getTaskWatcherCount } from "@/lib/taskListUtils";

interface ProjectTasksTabProps {
  projectId: string;
  onRefresh?: () => void;
  isCompact?: boolean;
}

const ProjectTasksTab = ({ projectId, onRefresh, isCompact = false }: ProjectTasksTabProps) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateCreateDialogOpen] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getProjectTasks(projectId);
      const data = res.data;
      const list = Array.isArray(data) ? data : (data as any).tasks || [];
      setTasks(filterTopLevelTasks(list));
    } catch (err) {
      console.error("Failed to fetch project tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = () => {
    fetchTasks();
    if (onRefresh) onRefresh();
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("bg-muted animate-pulse rounded-lg", isCompact ? "h-14" : "h-20")} />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={cn(isCompact && "py-4")}>
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description={isCompact ? "" : "Get started by creating your first task for this project."}
          action={
            <Button size={isCompact ? "sm" : "default"} onClick={() => setIsCreateCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          }
        />
        <CreateTaskDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateCreateDialogOpen}
          onSuccess={handleTaskCreated}
          projectId={projectId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {!isCompact && (
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Tasks
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.reduce((acc, t) => acc + getTaskSubtaskCount(t), 0)} subtasks •{" "}
              {tasks.reduce((acc, t) => acc + getTaskWatcherCount(t), 0)} watchers
            </p>
          </div>
          <Button size="sm" variant="ghost" className="text-primary" onClick={() => setIsCreateCreateDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Task
          </Button>
        </div>
      )}

      {isCompact ? (
        <CompactTaskTable
          tasks={tasks}
          onEdit={(task) => navigate(`/task-details/${task.id}`)}
        />
      ) : (
        <TaskTable
          tasks={tasks}
          showActions={true}
          onEdit={(task) => navigate(`/task-details/${task.id}`)}
        />
      )}

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateCreateDialogOpen}
        onSuccess={handleTaskCreated}
        projectId={projectId}
      />
    </div>
  );
};

export default ProjectTasksTab;
