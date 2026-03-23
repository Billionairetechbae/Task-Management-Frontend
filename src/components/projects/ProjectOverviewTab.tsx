import { Project, Task, ProjectChecklist } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, CheckCircle2, ClipboardList, Clock, ListChecks, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface ProjectOverviewTabProps {
  project: Project;
  tasks: Task[];
  checklists: ProjectChecklist[];
}

const ProjectOverviewTab = ({ project, tasks, checklists }: ProjectOverviewTabProps) => {
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const taskCompletion = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const totalItems = checklists.reduce((acc, cl) => acc + (cl.items?.length || 0), 0);
  const completedItems = checklists.reduce((acc, cl) => acc + (cl.items?.filter(i => i.isCompleted).length || 0), 0);
  const checklistCompletion = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const overallProgress = Math.round((taskCompletion + checklistCompletion) / 2);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardList className="w-4 h-4" />} label="Total Tasks" value={tasks.length} color="text-primary" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={completedTasks} color="text-success" />
        <StatCard icon={<Clock className="w-4 h-4" />} label="In Progress" value={inProgressTasks} color="text-info" />
        <StatCard icon={<ListChecks className="w-4 h-4" />} label="Checklists" value={checklists.length} color="text-warning" />
      </div>

      {/* Progress Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground">{overallProgress}%</span>
                <span className="text-xs text-muted-foreground">combined</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-info" />
              Project Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start</span>
                <span className="font-medium text-foreground">
                  {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End</span>
                <span className="font-medium text-foreground">
                  {project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize text-foreground">{project.status.replace("_", " ")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task & Checklist Breakdowns */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-foreground">{completedTasks}/{tasks.length}</span>
              <span className="text-xs text-muted-foreground">{taskCompletion}%</span>
            </div>
            <Progress value={taskCompletion} className="h-1.5" />
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Checklist Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-foreground">{completedItems}/{totalItems}</span>
              <span className="text-xs text-muted-foreground">{checklistCompletion}%</span>
            </div>
            <Progress value={checklistCompletion} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {project.description && (
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Placeholder */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Activity tracking coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <Card className="shadow-soft hover:shadow-elevated transition-shadow duration-200">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ProjectOverviewTab;
