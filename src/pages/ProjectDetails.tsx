import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api, Project, Task, ProjectChecklist } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, LayoutGrid, ListChecks, Settings } from "lucide-react";

import ProjectHeader from "@/components/projects/ProjectHeader";
import ProjectOverviewTab from "@/components/projects/ProjectOverviewTab";
import ProjectTasksTab from "@/components/projects/ProjectTasksTab";
import ProjectChecklistsTab from "@/components/projects/ProjectChecklistsTab";
import ProjectSettingsTab from "@/components/projects/ProjectSettingsTab";
import EditProjectDrawer from "@/components/projects/EditProjectDrawer";
import CreateProjectTaskDialog from "@/components/projects/CreateProjectTaskDialog";
import CreateChecklistDialog from "@/components/projects/CreateChecklistDialog";
import ProjectLogoUploader from "@/components/projects/ProjectLogoUploader";

const ProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<ProjectChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [checklistsLoading, setChecklistsLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createChecklistOpen, setCreateChecklistOpen] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.getProjectById(projectId);
      setProject(res.data.project);
    } catch (err: any) {
      toast({ title: "Error loading project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    setTasksLoading(true);
    try {
      const res = await api.getProjectTasks(projectId);
      setTasks(res.data.tasks || []);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [projectId]);

  const fetchChecklists = useCallback(async () => {
    if (!projectId) return;
    setChecklistsLoading(true);
    try {
      const res = await api.getProjectChecklists(projectId);
      setChecklists(res.data.checklists || []);
    } catch {
      setChecklists([]);
    } finally {
      setChecklistsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchChecklists();
  }, [fetchProject, fetchTasks, fetchChecklists]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Project not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="max-w-5xl mx-auto space-y-6">
          <ProjectHeader
            project={project}
            onEdit={() => setEditOpen(true)}
            onAddTask={() => setCreateTaskOpen(true)}
            onAddChecklist={() => setCreateChecklistOpen(true)}
            onUploadLogo={() => setLogoOpen(true)}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="overview" className="text-xs gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Tasks
              </TabsTrigger>
              <TabsTrigger value="checklists" className="text-xs gap-1.5">
                <ListChecks className="w-3.5 h-3.5" /> Checklists
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ProjectOverviewTab project={project} tasks={tasks} checklists={checklists} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <ProjectTasksTab tasks={tasks} loading={tasksLoading} onAddTask={() => setCreateTaskOpen(true)} />
            </TabsContent>

            <TabsContent value="checklists" className="mt-6">
              <ProjectChecklistsTab
                projectId={project.id}
                checklists={checklists}
                loading={checklistsLoading}
                onAddChecklist={() => setCreateChecklistOpen(true)}
                onRefresh={fetchChecklists}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <ProjectSettingsTab project={project} onRefresh={fetchProject} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals / Drawers */}
        <EditProjectDrawer
          project={project}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => { fetchProject(); }}
          mode="edit"
        />

        <CreateProjectTaskDialog
          projectId={project.id}
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          onSuccess={fetchTasks}
        />

        <CreateChecklistDialog
          projectId={project.id}
          open={createChecklistOpen}
          onOpenChange={setCreateChecklistOpen}
          onSuccess={fetchChecklists}
        />

        <ProjectLogoUploader
          projectId={project.id}
          currentLogo={project.logoUrl}
          open={logoOpen}
          onOpenChange={setLogoOpen}
          onSuccess={fetchProject}
        />
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default ProjectDetails;
