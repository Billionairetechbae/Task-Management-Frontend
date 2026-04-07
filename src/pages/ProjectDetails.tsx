import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project, ProjectStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Users, ClipboardList, ListChecks, Settings, Info, Plus, Pencil, Trash2, Calendar, TrendingUp, FolderOpen, ImagePlus, UserPlus, Save, X, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import ProjectTasksTab from "@/components/projects/ProjectTasksTab";
import ProjectChecklistsTab from "@/components/projects/ProjectChecklistsTab";
import ProjectLogoUploader from "@/components/projects/ProjectLogoUploader";
import ProjectMiniSidebar from "@/components/projects/ProjectMiniSidebar";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    description: "", 
    status: "active" as ProjectStatus 
  });

  // Members state
  const [memberEmail, setMemberEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [membersList, setMembersList] = useState<Array<{ id: string; role: string; status: string; firstName: string; lastName: string; email: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await api.getProjects();
      const arr = (res as any)?.data?.projects || (res as any)?.projects || (res as any)?.data || [];
      setProjects(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      console.error("Failed to load projects list", err);
    }
  };

  const loadProject = async () => {
    if (!id) return;
    try {
      const res = await api.getProjectById(id);
      const data = res.data;
      const p = (data as any)?.project || data;
      setProject(p || null);
      if (p) {
        setEditForm({ 
          name: p.name, 
          description: p.description || "", 
          status: p.status as ProjectStatus
        });
      }
    } catch (err: any) {
      toast({ title: "Failed to load project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!id || !project) return;
    try {
      await api.updateProject(id, editForm);
      toast({ title: "Project updated" });
      setIsEditing(false);
      loadProject();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleArchiveProject = async () => {
    if (!id || !project) return;
    if (!confirm("Are you sure you want to archive this project?")) return;
    try {
      await api.updateProject(id, { status: "completed" as ProjectStatus });
      toast({ title: "Project marked as completed" });
      navigate("/projects");
    } catch (err: any) {
      toast({ title: "Operation failed", description: err.message, variant: "destructive" });
    }
  };

  const handleManagePermissions = () => {
    toast({ title: "Permissions Management", description: "This feature is coming soon in the next update!" });
  };

  const loadMembers = async () => {
    if (!id) return;
    try {
      setLoadingMembers(true);
      const res = await api.getProjectMembers(id);
      const data = (res as any)?.data || {};
      setMembersList(Array.isArray(data.members) ? data.members : []);
    } catch (err: any) {
      toast({ title: "Failed to load members", description: err.message, variant: "destructive" });
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadProject();
    loadMembers();
  }, [id]);

  const handleLogoUpdated = (newUrl: string | null) => {
    if (project) {
      setProject({ ...project, logoUrl: newUrl });
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

  const addMember = async (emailToAdd?: string) => {
    const email = (emailToAdd || memberEmail).trim();
    if (!id || !email) return;

    try {
      setInviting(true);
      await api.inviteMembersByEmail(id, [email]);
      setMemberEmail("");
      await loadMembers();
      toast({ title: "Invitation sent", description: `An invitation has been sent to ${email}.` });
    } catch (err: any) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground animate-pulse font-medium">Loading workspace environment...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Info className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
          <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout fullWidth hidePadding>
      <TooltipProvider delayDuration={150}>
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
          {/* Mini Sidebar */}
          <ProjectMiniSidebar 
            projects={projects} 
            currentProjectId={project.id} 
            onAddProject={() => navigate("/projects?create=true")}
          />

          {/* Main Busy Screen */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col md:flex-row p-4 gap-4 overflow-x-auto scrollbar-thin">
              
              {/* Column 1: Overview & Team (380px fixed) */}
              <div className="w-[380px] flex flex-col gap-4 flex-shrink-0 h-full overflow-y-auto pr-1 pb-4 custom-scrollbar">
                
                {/* Header Section with Inline Editing */}
                <Card className="p-5 border-border shadow-soft shrink-0 relative overflow-hidden bg-gradient-to-br from-card to-muted/10">
                  <div className="flex items-start gap-4 mb-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setIsLogoModalOpen(true)}
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 overflow-hidden hover:border-primary/50 transition-all relative"
                        >
                          {project.logoUrl ? (
                            <>
                              <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <ImagePlus className="w-5 h-5 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-muted-foreground">
                              <FolderOpen className="w-6 h-6" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">LOGO</span>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Update Project Logo</TooltipContent>
                    </Tooltip>
                    
                    <div className="min-w-0 pt-1 flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input 
                            value={editForm.name} 
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-8 text-sm font-bold px-2"
                            placeholder="Project Name"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 px-2 text-[10px] gap-1" onClick={handleUpdateProject}>
                              <Save className="w-3 h-3" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={() => setIsEditing(false)}>
                              <X className="w-3 h-3" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex items-center gap-1.5 mb-1">
                          <h2 className="font-black text-xl truncate tracking-tight text-foreground">{project.name}</h2>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                onClick={() => setIsEditing(true)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Project Info</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      
                      {!isEditing && (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            project.status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {project.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                        Description
                      </h4>
                      {isEditing ? (
                        <Textarea 
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="text-xs min-h-[80px] leading-relaxed"
                          placeholder="Project scope and goals..."
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 bg-muted/40 p-3 rounded-xl border border-border/50 italic">
                          {project.description || "No project description provided yet."}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-primary" /> Start
                        </h4>
                        <p className="text-[11px] font-bold text-foreground">{project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "TBD"}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 justify-end text-destructive">
                          <Calendar className="w-3 h-3" /> Due
                        </h4>
                        <p className="text-[11px] font-bold text-foreground">{project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "TBD"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-card border border-border p-3 rounded-xl text-center shadow-sm">
                        <p className="text-xl font-black text-primary leading-none mb-1">{project._count?.tasks || 0}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Tasks</p>
                      </div>
                      <div className="bg-card border border-border p-3 rounded-xl text-center shadow-sm">
                        <p className="text-xl font-black text-success leading-none mb-1">{project._count?.checklists || 0}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Checklists</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Team Management Card */}
                <Card className="p-5 border-border shadow-soft flex-shrink-0 overflow-hidden flex flex-col bg-card">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-info" /> Team Members
                    </h3>
                  </div>
                  
                  <div className="flex gap-1.5 mb-4">
                    <Input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="h-8 text-xs font-medium bg-muted/30 border-none shadow-inner"
                      onKeyDown={(e) => e.key === "Enter" && addMember()}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" className="h-8 w-8 rounded-lg shadow-sm" onClick={() => addMember()} disabled={inviting || !memberEmail.trim()}>
                          {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Invite Member</TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {loadingMembers ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary/30" /></div>
                    ) : membersList.length > 0 ? (
                      membersList.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all text-xs group">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] shrink-0 border border-primary/20">
                              {m.firstName?.[0]}{m.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold truncate text-foreground leading-tight">{m.firstName} {m.lastName}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter opacity-60">{m.role}</p>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" onClick={() => removeMember(m.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Remove Member</TooltipContent>
                          </Tooltip>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-[10px] text-muted-foreground py-8 italic">No active members yet.</p>
                    )}
                  </div>

                  <div className="mt-6 pt-5 border-t border-border space-y-3">
                    <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Workspace Controls</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 text-[10px] font-black uppercase tracking-tighter gap-2 rounded-xl"
                        onClick={handleManagePermissions}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-info" /> Permissions
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 text-[10px] font-black uppercase tracking-tighter gap-2 rounded-xl text-destructive hover:bg-destructive/5"
                        onClick={handleArchiveProject}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Archive
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Column 2: Tasks Board (450px fixed) */}
              <div className="w-[450px] flex flex-col flex-shrink-0 h-full overflow-hidden pb-4">
                <Card className="flex flex-col h-full border-border shadow-soft overflow-hidden bg-card">
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                        <ClipboardList className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm leading-tight tracking-tight">Project Board</h3>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Active Tasks</p>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="default" className="h-8 w-8 rounded-lg shadow-md" onClick={() => setIsCreateTaskOpen(true)}>
                          <Plus className="w-4.5 h-4.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>New Task</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/5 custom-scrollbar">
                    <ProjectTasksTab projectId={project.id} onRefresh={loadProject} isCompact />
                  </div>
                </Card>
              </div>

              {/* Column 3: Checklists Flow (400px fixed) */}
              <div className="w-[400px] flex flex-col flex-shrink-0 h-full overflow-hidden pb-4">
                <Card className="flex flex-col h-full border-border shadow-soft overflow-hidden bg-card">
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-success text-success-foreground flex items-center justify-center shadow-sm">
                        <ListChecks className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm leading-tight tracking-tight">Milestones</h3>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Flow & Progress</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5 custom-scrollbar">
                    <ProjectChecklistsTab projectId={project.id} onRefresh={loadProject} />
                  </div>
                </Card>
              </div>

            </div>
          </div>

          <ProjectLogoUploader
            projectId={project.id}
            currentLogoUrl={project.logoUrl}
            onLogoUpdated={handleLogoUpdated}
            isOpen={isLogoModalOpen}
            onClose={() => setIsLogoModalOpen(false)}
          />

          <CreateTaskDialog 
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            onSuccess={loadProject}
            projectId={project.id}
          />
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
