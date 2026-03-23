import { Project } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, ListChecks, Info, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { StatsCard } from "@/components/dashboard/DashboardComponents";

interface ProjectOverviewTabProps {
  project: Project;
}

const ProjectOverviewTab = ({ project }: ProjectOverviewTabProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tasks"
          value={project._count?.tasks || 0}
          icon={ClipboardList}
        />
        <StatsCard
          title="Checklists"
          value={project._count?.checklists || 0}
          icon={ListChecks}
        />
        <StatsCard
          title="Project Status"
          value={project.status.replace("_", " ")}
          icon={TrendingUp}
          className="capitalize"
        />
        <StatsCard
          title="Timeline"
          value={project.startDate ? "Active" : "Planned"}
          icon={Calendar}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* About Section */}
        <Card className="lg:col-span-2 border border-border shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              About Project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1.5 text-foreground">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {project.description || "No description provided."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Start Date</h4>
                <p className="text-sm font-medium">
                  {project.startDate ? format(new Date(project.startDate), "MMMM d, yyyy") : "Not set"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">End Date</h4>
                <p className="text-sm font-medium">
                  {project.endDate ? format(new Date(project.endDate), "MMMM d, yyyy") : "Not set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health / Progress Placeholder */}
        <Card className="border border-border shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Project Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">--</span>
              </div>
              <p className="text-sm font-medium">Analytics coming soon</p>
              <p className="text-xs text-muted-foreground mt-1 px-4">
                We're processing your project data to provide health insights.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectOverviewTab;
