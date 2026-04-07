import { useEffect, useState } from "react";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateWorkspaceDialog from "@/components/CreateWorkspaceDialog";
import { cn } from "@/lib/utils";

const WorkspaceSwitcher = () => {
  const { workspaces, activeCompanyId, setActiveCompanyId, user, workspaceRole, activeWorkspace } = useAuth();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("workspace:switcher-open", handler);
    return () => window.removeEventListener("workspace:switcher-open", handler);
  }, []);

  const label = activeWorkspace?.name || "Select workspace";
  const subtitle = workspaceRole ? workspaceRole.toUpperCase() : user?.role?.toUpperCase();

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 px-2 sm:px-3 h-8 border border-border hover:border-primary/30 bg-background"
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium leading-tight max-w-[100px] truncate sm:max-w-[140px] text-foreground">
                    {label}
                  </span>
                  {subtitle && (
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {subtitle}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-3 w-3 ml-0.5 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Switch Workspace</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-64 animate-scale-in">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.length === 0 && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No workspaces available
            </DropdownMenuItem>
          )}
          {workspaces.map((workspace) => {
            const isSelected = workspace.id === activeCompanyId;
            return (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => {
                  setActiveCompanyId(workspace.id);
                  window.location.reload();
                }}
                className={cn(
                  "flex items-center gap-3 py-2.5 cursor-pointer transition-colors duration-150",
                  isSelected && "bg-accent"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm block truncate", isSelected && "font-semibold")}>
                    {workspace.name || "Workspace"}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {workspace.role}
                  </span>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="text-primary cursor-pointer gap-2 py-2.5"
          >
            <Plus className="h-4 w-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
};

export default WorkspaceSwitcher;
