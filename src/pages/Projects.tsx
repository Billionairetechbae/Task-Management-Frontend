import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, Project } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Calendar, FolderOpen, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import EditProjectDrawer from "@/components/projects/EditProjectDrawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  planning: "bg-info/15 text-info border-info/30",
  active: "bg-success/15 text-success border-success/30",
  on_hold: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.getProjects({ search: search || undefined });
      setProjects(res.data.projects || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchProjects, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteProject(deleteTarget.id);
      toast({ title: "Project deleted" });
      setDeleteTarget(null);
      fetchProjects();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Projects</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace projects</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Project
            </Button>
          </div>

          {/* Search */}
          <div className="relative animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : projects.length === 0 ? (
            <Card className="shadow-soft animate-fade-in">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FolderOpen className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs">Create your first project to organize tasks and checklists.</p>
                <Button onClick={() => setCreateOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Create Project
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, idx) => (
                <Card
                  key={project.id}
                  className="shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group border hover:border-primary/20 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {project.logoUrl ? (
                          <img src={project.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FolderOpen className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{project.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn("text-[10px] border", statusColors[project.status] || "")}>
                        {project.status.replace("_", " ")}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {project.endDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(project.endDate), "MMM d")}
                          </span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                              onClick={e => { e.stopPropagation(); setDeleteTarget(project); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete project</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <EditProjectDrawer
          project={null}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={fetchProjects}
          mode="create"
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default Projects;
