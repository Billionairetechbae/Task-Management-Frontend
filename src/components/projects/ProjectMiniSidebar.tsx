import { Project } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Folder, Plus, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";

interface ProjectMiniSidebarProps {
  projects: Project[];
  currentProjectId?: string;
  onAddProject?: () => void;
}

export default function ProjectMiniSidebar({ 
  projects, 
  currentProjectId,
  onAddProject 
}: ProjectMiniSidebarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="w-16 border-r border-border bg-muted/20 flex flex-col items-center py-4 gap-4 overflow-y-auto h-full scrollbar-none shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              to="/projects"
              className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all shadow-sm"
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">All Projects</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={onAddProject}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Create New Project</TooltipContent>
        </Tooltip>

        <div className="w-8 h-px bg-border my-2" />

        <div className="flex flex-col gap-3 w-full items-center">
          {projects.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Link
                  to={`/projects/${p.id}`}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative",
                    currentProjectId === p.id 
                      ? "bg-primary/10 text-primary shadow-inner" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {currentProjectId === p.id && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                  )}
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={p.name} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <Folder className={cn("w-5 h-5", currentProjectId === p.id ? "fill-primary/20" : "")} />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {p.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
