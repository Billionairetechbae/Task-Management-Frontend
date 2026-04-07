import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, FolderKanban, Calendar, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import EditProjectDrawer from "@/components/projects/EditProjectDrawer";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Projects() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getProjects();
      const arr = (res as any)?.data?.projects || (res as any)?.projects || (res as any)?.data || [];
      const list = Array.isArray(arr) ? arr : [];
      setProjects(list);

      // Auto-redirect to last project for returning users
      const searchParams = new URLSearchParams(window.location.search);
      const isCreating = searchParams.get("create") === "true";

      if (isCreating) {
        setIsCreateOpen(true);
      } else if (list.length > 0) {
        // Redirect to last accessed or first project
        const lastProjectId = localStorage.getItem("lastProjectId");
        const target = list.find((p: Project) => p.id === lastProjectId) || list[0];
        navigate(`/projects/${target.id}`, { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Failed to load projects", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleProjectCreated = () => {
    load();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading projects...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={150}>
        <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-soft active:scale-[0.97] transition-transform">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a new project</TooltipContent>
            </Tooltip>
          </div>

          {projects.length === 0 ? (
            /* Empty state */
            <Card className="p-12 text-center border-dashed border-2 border-border">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Create Your First Project</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Projects help you organize tasks, checklists, and team members around a shared goal.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </Card>
          ) : (
            /* Projects grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p, i) => (
                <Card
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="p-4 cursor-pointer border-border hover:border-primary/30 hover:shadow-elevated transition-all group animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.logoUrl ? (
                        <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black text-primary uppercase">{p.name.slice(0, 2)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.name}</h3>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                        p.status === "active" ? "bg-primary/10 text-primary" :
                        p.status === "completed" ? "bg-success/10 text-success" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {p.status}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {p.description || "No description"}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {p.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(p.startDate), "MMM d")}
                      </span>
                    )}
                    <span>{p._count?.tasks || 0} tasks</span>
                    <span>{p._count?.checklists || 0} checklists</span>
                  </div>
                </Card>
              ))}

              {/* Add project card */}
              <Card
                onClick={() => setIsCreateOpen(true)}
                className="p-4 cursor-pointer border-dashed border-2 border-border hover:border-primary/40 transition-all flex items-center justify-center min-h-[140px] group"
              >
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10 transition-colors">
                    <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">New Project</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </TooltipProvider>

      <EditProjectDrawer
        project={null}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleProjectCreated}
        mode="create"
      />
    </DashboardLayout>
  );
}
