import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateWorkspaceDialog from "@/components/CreateWorkspaceDialog";

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
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 px-2 sm:px-3"
          >
            <Building2 className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium leading-tight max-w-[120px] truncate sm:max-w-[160px]">
                {label}
              </span>
              {subtitle && (
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {subtitle}
                </span>
              )}
            </div>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.length === 0 && (
            <DropdownMenuItem disabled>
              No workspaces available
            </DropdownMenuItem>
          )}
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => {
                setActiveCompanyId(workspace.id);
                window.location.reload();
              }}
              className={workspace.id === activeCompanyId ? "font-semibold" : ""}
            >
              <div className="flex flex-col">
                <span>{workspace.name || "Workspace"}</span>
                <span className="text-[11px] text-muted-foreground">
                  {workspace.role.toUpperCase()}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="text-primary">
            + Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
};

export default WorkspaceSwitcher;
