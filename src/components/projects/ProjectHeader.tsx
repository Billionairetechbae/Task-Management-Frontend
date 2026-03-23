import { Project } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Edit, ImagePlus, ListChecks, Plus, Settings, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getStatusBadgeClass } from "@/components/dashboard/TaskComponents";

interface ProjectHeaderProps {
  project: Project;
  onEdit?: () => void;
  onAddTask?: () => void;
  onAddChecklist?: () => void;
  onUploadLogo?: () => void;
}

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
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{project.name}</h1>
            <Badge className={cn("text-[10px] uppercase tracking-wider px-2 py-0", getStatusBadgeClass(project.status))}>
              {project.status.replace("_", " ")}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 max-w-2xl">
            {project.description || "No description provided for this project."}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {(project.startDate || project.endDate) && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "TBD"}
                  {" — "}
                  {project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "TBD"}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">{project._count?.tasks || 0}</span>
                <span>Tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">{project._count?.checklists || 0}</span>
                <span>Checklists</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-start gap-2">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Project</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={onAddTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Task</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={onAddChecklist}>
                  <ListChecks className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Checklist</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
