import { Project } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Edit, ImagePlus, ListChecks, Plus, Settings, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProjectHeaderProps {
  project: Project;
  onEdit: () => void;
  onAddTask: () => void;
  onAddChecklist: () => void;
  onUploadLogo: () => void;
}

const statusColors: Record<string, string> = {
  planning: "bg-info/15 text-info border-info/30",
  active: "bg-success/15 text-success border-success/30",
  on_hold: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const ProjectHeader = ({ project, onEdit, onAddTask, onAddChecklist, onUploadLogo }: ProjectHeaderProps) => {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Logo */}
        <button
          onClick={onUploadLogo}
          className={cn(
            "group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-elevated",
            project.logoUrl && "border-solid border-border"
          )}
        >
          {project.logoUrl ? (
            <>
              <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImagePlus className="w-5 h-5 text-primary-foreground" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
              <FolderOpen className="w-6 h-6" />
              <span className="text-[10px] font-medium">Logo</span>
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              )}
            </div>
            <Badge variant="outline" className={cn("text-xs shrink-0 border", statusColors[project.status] || "")}>
              {project.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Dates + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {project.startDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(project.startDate), "MMM d, yyyy")}
                </span>
              )}
              {project.startDate && project.endDate && <span>→</span>}
              {project.endDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(project.endDate), "MMM d, yyyy")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={onEdit}>
                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit project details</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={onAddTask}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Task
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create a new task</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="secondary" onClick={onAddChecklist}>
                    <ListChecks className="w-3.5 h-3.5 mr-1.5" /> Checklist
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add a checklist</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
