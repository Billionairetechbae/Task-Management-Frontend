import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project, ProjectChecklist, ChecklistItem, ProjectInvite } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ProjectMiniSidebar from "@/components/projects/ProjectMiniSidebar";
import ProjectLogoUploader from "@/components/projects/ProjectLogoUploader";
import EditProjectDrawer from "@/components/projects/EditProjectDrawer";
import CreateProjectTaskDialog from "@/components/projects/CreateProjectTaskDialog";
import CreateChecklistDialog from "@/components/projects/CreateChecklistDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Loader2, Info, Plus, Pencil, Trash2, Calendar, FolderOpen, ImagePlus,
  UserPlus, Save, X, Users, ClipboardList, ListChecks, Settings,
  ChevronDown, ChevronRight, MoreHorizontal, Eye, Mail, RefreshCw,
  XCircle, Check, Link2
} from "lucide-react";

type MemberRow = { id: string; userId: string; role: string; status: string; firstName: string; lastName: string; email: string };

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [checklists, setChecklists] = useState<ProjectChecklist[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // UI state
  const [isLogoOpen, setIsLogoOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateChecklistOpen, setIsCreateChecklistOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Collapsible panels
  const [openPanels, setOpenPanels] = useState({
    overview: true,
    tasks: true,
    checklists: true,
    members: true,
    settings: false,
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({ name: "", description: "", status: "active", startDate: "", endDate: "" });
  const [savingSettings, setSavingSettings] = useState(false);

  const togglePanel = (key: keyof typeof openPanels) => {
    setOpenPanels(p => ({ ...p, [key]: !p[key] }));
  };

  // Save last visited project
  useEffect(() => {
    if (id) localStorage.setItem("lastProjectId", id);
  }, [id]);

  const loadProjects = async () => {
    try {
      const res = await api.getProjects();
      const arr = (res as any)?.data?.projects || (res as any)?.projects || (res as any)?.data || [];
      setProjects(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  };

  const loadProject = async () => {
    if (!id) return;
    try {
      const res = await api.getProjectById(id);
      const p = (res as any)?.data?.project || res.data;
      setProject(p || null);
      if (p) {
        setSettingsForm({
          name: p.name || "",
          description: p.description || "",
          status: p.status || "active",
          startDate: p.startDate ? p.startDate.slice(0, 10) : "",
          endDate: p.endDate ? p.endDate.slice(0, 10) : "",
        });
      }
    } catch (err: any) {
      toast({ title: "Failed to load project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    try {
      const res = await api.getProjectMembers(id);
      const data = (res as any)?.data || {};
      setMembers(Array.isArray(data.members) ? data.members : []);
      setInvites(Array.isArray(data.invites) ? data.invites : []);
    } catch (err) {
      console.error("Failed to load members", err);
    }
  };

  const loadTasks = async () => {
    if (!id) return;
    try {
      const res = await api.getProjectTasks(id);
      const data = res.data;
      const list = Array.isArray(data) ? data : (data as any)?.tasks || [];
      setTasks(list);
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  };

  const loadChecklists = async () => {
    if (!id) return;
    try {
      const res = await api.getProjectChecklists(id);
      const data = res.data;
      const list = Array.isArray(data) ? data : (data as any)?.checklists || [];
      setChecklists(list);
    } catch (err) {
      console.error("Failed to load checklists", err);
    }
  };

  const refreshAll = () => {
    loadProject();
    loadMembers();
    loadTasks();
    loadChecklists();
  };

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => {
    setLoading(true);
    refreshAll();
  }, [id]);

  // Members
  const addMember = async () => {
    if (!id || !memberEmail.trim()) return;
    try {
      setInviting(true);
      await api.inviteMembersByEmail(id, [memberEmail.trim()]);
      setMemberEmail("");
      await loadMembers();
      toast({ title: "Invitation sent" });
    } catch (err: any) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!id) return;
    try {
      await api.removeProjectMember(id, userId);
      await loadMembers();
      toast({ title: "Member removed" });
    } catch (err: any) {
      toast({ title: "Remove failed", description: err.message, variant: "destructive" });
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!id) return;
    try {
      await api.revokeProjectInvite(id, inviteId);
      await loadMembers();
      toast({ title: "Invite revoked" });
    } catch (err: any) {
      toast({ title: "Revoke failed", description: err.message, variant: "destructive" });
    }
  };

  const resendInvite = async (inviteId: string) => {
    if (!id) return;
    try {
      await api.resendProjectInvite(id, inviteId);
      toast({ title: "Invite resent" });
    } catch (err: any) {
      toast({ title: "Resend failed", description: err.message, variant: "destructive" });
    }
  };

  // Checklists
  const handleToggleItem = async (checklistId: string, itemId: string, isCompleted: boolean) => {
    if (!id) return;
    setChecklists(prev => prev.map(cl =>
      cl.id === checklistId
        ? { ...cl, items: cl.items?.map(it => it.id === itemId ? { ...it, isCompleted } : it) }
        : cl
    ));
    try {
      await api.updateChecklistItem(id, checklistId, itemId, { isCompleted });
    } catch (err: any) {
      loadChecklists();
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleDeleteChecklistItem = async (checklistId: string, itemId: string) => {
    if (!id) return;
    try {
      await api.deleteChecklistItem(id, checklistId, itemId);
      setChecklists(prev => prev.map(cl =>
        cl.id === checklistId
          ? { ...cl, items: cl.items?.filter(it => it.id !== itemId) }
          : cl
      ));
    } catch (err: any) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!id) return;
    try {
      await api.deleteProjectChecklist(id, checklistId);
      setChecklists(prev => prev.filter(cl => cl.id !== checklistId));
      toast({ title: "Checklist deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // Settings
  const saveSettings = async () => {
    if (!id) return;
    try {
      setSavingSettings(true);
      await api.updateProject(id, {
        name: settingsForm.name,
        description: settingsForm.description,
        status: settingsForm.status as any,
        startDate: settingsForm.startDate || null,
        endDate: settingsForm.endDate || null,
      });
      toast({ title: "Project updated" });
      loadProject();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpdated = (newUrl: string | null) => {
    if (project) setProject({ ...project, logoUrl: newUrl });
  };

  if (loading) {
    return (
      <DashboardLayout fullWidth hidePadding>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Info className="w-12 h-12 text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Project Not Found</h1>
          <Button onClick={() => navigate("/projects")} className="mt-4">Back to Projects</Button>
        </div>
      </DashboardLayout>
    );
  }

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    pending: tasks.filter(t => t.status === "pending").length,
  };

  return (
    <DashboardLayout fullWidth hidePadding>
      <TooltipProvider delayDuration={100}>
        <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-background">
          {/* Mini sidebar */}
          <div className="hidden md:flex">
            <ProjectMiniSidebar
              projects={projects}
              currentProjectId={project.id}
              onAddProject={() => navigate("/projects?create=true")}
            />
          </div>

          {/* Main content: scrollable columns */}
          <div className="flex-1 overflow-y-auto">
            {/* Mobile project switcher */}
            <div className="md:hidden flex items-center gap-2 p-3 border-b border-border bg-card overflow-x-auto scrollbar-none">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    p.id === project.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => navigate("/projects?create=true")}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-primary"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Project header banner */}
            <div className="relative border-b border-border bg-card overflow-hidden">
              {/* Background banner with logo */}
              <div className="relative h-28 md:h-36 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
                {project.logoUrl && (
                  <img
                    src={project.logoUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-15 blur-sm"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
              </div>

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-4">
                <div className="flex items-end gap-4">
                  {/* Logo avatar */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setIsLogoOpen(true)}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 border-background bg-card shadow-elevated flex items-center justify-center shrink-0 overflow-hidden hover:border-primary/40 transition-all group -mb-0"
                      >
                        {project.logoUrl ? (
                          <img src={project.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FolderOpen className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Change Logo</TooltipContent>
                  </Tooltip>

                  {/* Project info */}
                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h1 className="font-bold text-lg md:text-xl truncate">{project.name}</h1>
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase tracking-wider shrink-0",
                        project.status === "active" && "border-primary/30 text-primary bg-primary/5"
                      )}>
                        {project.status}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-lg">{project.description}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                    <Tooltip><TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 shadow-sm" onClick={() => setIsEditOpen(true)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger><TooltipContent>Edit Project</TooltipContent></Tooltip>

                    <Tooltip><TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 shadow-sm" onClick={() => setIsCreateTaskOpen(true)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger><TooltipContent>New Task</TooltipContent></Tooltip>

                    <Tooltip><TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 shadow-sm" onClick={() => setIsCreateChecklistOpen(true)}>
                        <ListChecks className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger><TooltipContent>New Checklist</TooltipContent></Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* Dense multi-panel layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-0">
              
              {/* Left column: Overview + Members */}
              <div className="lg:col-span-3 border-r border-border bg-card/50 overflow-y-auto lg:h-[calc(100vh-56px-144px)]">
                {/* Overview panel */}
                <CollapsiblePanel
                  title="Overview"
                  icon={<Info className="w-3.5 h-3.5" />}
                  open={openPanels.overview}
                  onToggle={() => togglePanel("overview")}
                >
                  <div className="px-3 pb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <MiniStat label="Tasks" value={taskStats.total} color="text-primary" />
                      <MiniStat label="Done" value={taskStats.completed} color="text-success" />
                      <MiniStat label="Active" value={taskStats.inProgress} color="text-info" />
                      <MiniStat label="Pending" value={taskStats.pending} color="text-warning" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "No start"}</span>
                        <span>→</span>
                        <span>{project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "No end"}</span>
                      </div>
                    </div>
                    {taskStats.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                          <span>Completion</span>
                          <span>{taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%</span>
                        </div>
                        <Progress value={taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </CollapsiblePanel>

                {/* Members panel */}
                <CollapsiblePanel
                  title={`Members (${members.length})`}
                  icon={<Users className="w-3.5 h-3.5" />}
                  open={openPanels.members}
                  onToggle={() => togglePanel("members")}
                >
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex gap-1.5">
                      <Input
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="h-7 text-[11px] bg-muted/30"
                        onKeyDown={(e) => e.key === "Enter" && addMember()}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" className="h-7 w-7 shrink-0" onClick={addMember} disabled={inviting || !memberEmail.trim()}>
                            {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Invite by Email</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-none">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors group text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                              {m.firstName?.[0]}{m.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate leading-tight">{m.firstName} {m.lastName}</p>
                              <p className="text-[9px] text-muted-foreground truncate">{m.role}</p>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removeMember(m.userId || m.id)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                      {members.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-4 italic">No members yet</p>
                      )}
                    </div>

                    {/* Pending invites */}
                    {invites.length > 0 && (
                      <div className="pt-2 border-t border-border space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Pending Invites</p>
                        {invites.filter(inv => inv.status === "pending" || inv.status === "pending_workspace").map(inv => (
                          <div key={inv.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-warning/5 text-[10px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Mail className="w-3 h-3 text-warning shrink-0" />
                              <span className="truncate">{inv.email}</span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => resendInvite(inv.id)}>
                                    <RefreshCw className="w-2.5 h-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Resend</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => revokeInvite(inv.id)}>
                                    <XCircle className="w-2.5 h-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Revoke</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsiblePanel>

                {/* Settings panel */}
                <CollapsiblePanel
                  title="Settings"
                  icon={<Settings className="w-3.5 h-3.5" />}
                  open={openPanels.settings}
                  onToggle={() => togglePanel("settings")}
                >
                  <div className="px-3 pb-3 space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Name</label>
                      <Input value={settingsForm.name} onChange={(e) => setSettingsForm(p => ({ ...p, name: e.target.value }))} className="h-7 text-[11px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                      <Textarea value={settingsForm.description} onChange={(e) => setSettingsForm(p => ({ ...p, description: e.target.value }))} className="text-[11px] min-h-[50px]" rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Start</label>
                        <Input type="date" value={settingsForm.startDate} onChange={(e) => setSettingsForm(p => ({ ...p, startDate: e.target.value }))} className="h-7 text-[10px] px-1.5" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">End</label>
                        <Input type="date" value={settingsForm.endDate} onChange={(e) => setSettingsForm(p => ({ ...p, endDate: e.target.value }))} className="h-7 text-[10px] px-1.5" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                      <select
                        value={settingsForm.status}
                        onChange={(e) => setSettingsForm(p => ({ ...p, status: e.target.value }))}
                        className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-[11px]"
                      >
                        <option value="planning">Planning</option>
                        <option value="active">Active</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <Button onClick={saveSettings} disabled={savingSettings} className="w-full h-7 text-[10px] gap-1.5">
                      {savingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save Settings
                    </Button>
                  </div>
                </CollapsiblePanel>
              </div>

              {/* Center column: Tasks */}
              <div className="lg:col-span-5 border-r border-border overflow-y-auto lg:h-[calc(100vh-56px-144px)]">
                <CollapsiblePanel
                  title={`Tasks (${tasks.length})`}
                  icon={<ClipboardList className="w-3.5 h-3.5" />}
                  open={openPanels.tasks}
                  onToggle={() => togglePanel("tasks")}
                  action={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsCreateTaskOpen(true); }}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>New Task</TooltipContent>
                    </Tooltip>
                  }
                >
                  <div className="divide-y divide-border">
                    {tasks.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No tasks yet</p>
                        <Button size="sm" variant="outline" className="mt-3 h-7 text-[10px] gap-1" onClick={() => setIsCreateTaskOpen(true)}>
                          <Plus className="w-3 h-3" /> Add Task
                        </Button>
                      </div>
                    ) : (
                      tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/task-details/${task.id}`)}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            task.status === "completed" ? "bg-success" :
                            task.status === "in_progress" ? "bg-info" :
                            task.status === "cancelled" ? "bg-destructive" :
                            "bg-warning"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs font-medium truncate leading-tight",
                              task.status === "completed" && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.priority && (
                                <span className={cn(
                                  "text-[8px] font-bold uppercase tracking-wider",
                                  task.priority === "high" || task.priority === "urgent" ? "text-destructive" :
                                  task.priority === "medium" ? "text-warning" : "text-muted-foreground"
                                )}>
                                  {task.priority}
                                </span>
                              )}
                              {task.deadline && (
                                <span className="text-[9px] text-muted-foreground">
                                  {format(new Date(task.deadline), "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>
                          {task.assignee && (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                                  {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{task.assignee.firstName} {task.assignee.lastName}</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/task-details/${task.id}`); }}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsiblePanel>
              </div>

              {/* Right column: Checklists */}
              <div className="lg:col-span-4 overflow-y-auto lg:h-[calc(100vh-56px-144px)]">
                <CollapsiblePanel
                  title={`Checklists (${checklists.length})`}
                  icon={<ListChecks className="w-3.5 h-3.5" />}
                  open={openPanels.checklists}
                  onToggle={() => togglePanel("checklists")}
                  action={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsCreateChecklistOpen(true); }}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>New Checklist</TooltipContent>
                    </Tooltip>
                  }
                >
                  <div className="space-y-0">
                    {checklists.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <ListChecks className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No checklists yet</p>
                        <Button size="sm" variant="outline" className="mt-3 h-7 text-[10px] gap-1" onClick={() => setIsCreateChecklistOpen(true)}>
                          <Plus className="w-3 h-3" /> Add Checklist
                        </Button>
                      </div>
                    ) : (
                      checklists.map(cl => (
                        <ChecklistPanel
                          key={cl.id}
                          projectId={project.id}
                          checklist={cl}
                          onToggleItem={handleToggleItem}
                          onDeleteItem={handleDeleteChecklistItem}
                          onDeleteChecklist={handleDeleteChecklist}
                          onRefresh={loadChecklists}
                        />
                      ))
                    )}
                  </div>
                </CollapsiblePanel>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* Modals */}
      <ProjectLogoUploader projectId={project.id} currentLogoUrl={project.logoUrl} onLogoUpdated={handleLogoUpdated} isOpen={isLogoOpen} onClose={() => setIsLogoOpen(false)} />
      <EditProjectDrawer project={project} open={isEditOpen} onOpenChange={setIsEditOpen} onSuccess={refreshAll} mode="edit" />
      <CreateProjectTaskDialog projectId={project.id} open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen} onSuccess={() => { loadTasks(); loadProject(); }} />
      <CreateChecklistDialog projectId={project.id} open={isCreateChecklistOpen} onOpenChange={setIsCreateChecklistOpen} onSuccess={() => { loadChecklists(); loadProject(); }} />
    </DashboardLayout>
  );
}

// ─── Reusable: Collapsible Panel ─────────────────────────────
function CollapsiblePanel({ title, icon, open, onToggle, children, action }: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors border-b border-border group">
          {open ? <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform" /> : <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform" />}
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-[11px] font-semibold flex-1 tracking-tight">{title}</span>
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-accordion-down">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Reusable: Mini Stat ─────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2 text-center">
      <p className={cn("text-lg font-bold leading-none", color || "text-foreground")}>{value}</p>
      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

// ─── Reusable: Checklist Panel ───────────────────────────────
function ChecklistPanel({ projectId, checklist, onToggleItem, onDeleteItem, onDeleteChecklist, onRefresh }: {
  projectId: string;
  checklist: ProjectChecklist;
  onToggleItem: (clId: string, itemId: string, checked: boolean) => void;
  onDeleteItem: (clId: string, itemId: string) => void;
  onDeleteChecklist: (clId: string) => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [newItem, setNewItem] = useState("");
  const items = checklist.items || [];
  const completed = items.filter(i => i.isCompleted).length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;

  const addItem = async () => {
    if (!newItem.trim()) return;
    try {
      await api.createChecklistItem(projectId, checklist.id, newItem.trim());
      setNewItem("");
      onRefresh();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors">
        <button onClick={() => setOpen(!open)} className="shrink-0">
          {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        </button>
        <span className="text-[11px] font-semibold flex-1 truncate">{checklist.title}</span>
        <span className="text-[9px] text-muted-foreground shrink-0">{completed}/{items.length}</span>
        <Progress value={progress} className="w-12 h-1 shrink-0" />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Options</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive text-xs" onClick={() => onDeleteChecklist(checklist.id)}>
              <Trash2 className="w-3 h-3 mr-1.5" /> Delete Checklist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && (
        <div className="px-3 pb-2 space-y-0.5 animate-fade-in">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-1 group pl-5">
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={(checked) => onToggleItem(checklist.id, item.id, !!checked)}
                className="h-3.5 w-3.5"
              />
              <span className={cn(
                "text-[11px] flex-1 transition-all",
                item.isCompleted && "line-through text-muted-foreground"
              )}>
                {item.title}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDeleteItem(checklist.id, item.id)}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Item</TooltipContent>
              </Tooltip>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pl-5 pt-1">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add item..."
              className="h-6 text-[10px] bg-transparent border-none shadow-none px-0 focus-visible:ring-0"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            {newItem.trim() && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={addItem}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
