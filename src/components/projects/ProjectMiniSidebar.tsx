import { Project } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Folder, Plus, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "border-r border-border bg-sidebar-background flex flex-col items-center py-3 gap-2 overflow-y-auto h-full scrollbar-none shrink-0 transition-all duration-200 relative",
        collapsed ? "w-0 overflow-hidden p-0 border-0" : "w-14"
      )}>
        {/* Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Collapse</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              to="/projects"
              className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/80 transition-all"
            >
              <LayoutGrid className="w-4 h-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">All Projects</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={onAddProject}
              className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">New Project</TooltipContent>
        </Tooltip>

        <div className="w-6 h-px bg-sidebar-border my-1" />

        <div className="flex flex-col gap-1.5 w-full items-center flex-1 overflow-y-auto scrollbar-none">
          {projects.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Link
                  to={`/projects/${p.id}`}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group",
                    currentProjectId === p.id 
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30" 
                      : "hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground"
                  )}
                >
                  {currentProjectId === p.id && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r-full" />
                  )}
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={p.name} className="w-5 h-5 rounded object-cover" />
                  ) : (
                    <span className="text-[10px] font-black uppercase leading-none">
                      {p.name.slice(0, 2)}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium text-xs">
                {p.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Collapsed: show tiny expand button */}
      {collapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCollapsed(false)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-sidebar-accent border border-border rounded-r-lg flex items-center justify-center text-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              style={{ position: "fixed", left: "var(--sidebar-width, 64px)" }}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Show Projects</TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
}
