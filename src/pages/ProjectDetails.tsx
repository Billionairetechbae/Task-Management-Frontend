import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project, ProjectInvite } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Users, ClipboardList, ListChecks, Settings, Info } from "lucide-react";

import ProjectHeader from "@/components/projects/ProjectHeader";
import ProjectOverviewTab from "@/components/projects/ProjectOverviewTab";
import ProjectTasksTab from "@/components/projects/ProjectTasksTab";
import ProjectChecklistsTab from "@/components/projects/ProjectChecklistsTab";
import ProjectSettingsTab from "@/components/projects/ProjectSettingsTab";
import ProjectLogoUploader from "@/components/projects/ProjectLogoUploader";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Members state (from original implementation)
  const [memberEmail, setMemberEmail] = useState("");
  const [memberAdding, setMemberAdding] = useState(false);
  const [emailList, setEmailList] = useState("");
  const [inviting, setInviting] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [includeExternal, setIncludeExternal] = useState(true);
  const [membersList, setMembersList] = useState<Array<{ id: string; role: string; status: string; firstName: string; lastName: string; email: string }>>([]);
  const [invitesList, setInvitesList] = useState<ProjectInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadProject = async () => {
    if (!id) return;
    try {
      const res = await api.getProjectById(id);
      const data = res.data;
      const p = (data as any)?.project || data;
      setProject(p || null);
    } catch (err: any) {
      toast({ title: "Failed to load project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    try {
      setLoadingMembers(true);
      const res = await api.getProjectMembers(id);
      const data = (res as any)?.data || {};
      setMembersList(Array.isArray(data.members) ? data.members : []);
      setInvitesList(Array.isArray(data.invites) ? data.invites : []);
    } catch (err: any) {
      toast({ title: "Failed to load members", description: err.message, variant: "destructive" });
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadCandidates = async () => {
    if (!id) return;
    try {
      const res = await api.getProjectCandidates(id, includeExternal);
      const items = (res as any)?.data?.candidates || (res as any)?.candidates || [];
      setCandidates(Array.isArray(items) ? items : []);
    } catch (err: any) {
      toast({ title: "Failed to load candidates", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    loadProject();
    loadMembers();
  }, [id]);

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, includeExternal]);

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
          <p className="text-muted-foreground animate-pulse">Loading project details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
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
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <ProjectHeader
          project={project}
          onEdit={() => setActiveTab("settings")}
          onAddTask={() => setActiveTab("tasks")}
          onAddChecklist={() => setActiveTab("checklists")}
          onUploadLogo={() => setIsLogoModalOpen(true)}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-px overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              <TabsTrigger
                value="overview"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-0 h-auto font-semibold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Overview
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-0 h-auto font-semibold transition-all"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Tasks
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="checklists"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-0 h-auto font-semibold transition-all"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Checklists
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-0 h-auto font-semibold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3 pt-0 h-auto font-semibold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <ProjectOverviewTab project={project} />
          </TabsContent>

          <TabsContent value="tasks">
            <ProjectTasksTab projectId={project.id} onRefresh={loadProject} />
          </TabsContent>

          <TabsContent value="checklists">
            <ProjectChecklistsTab projectId={project.id} onRefresh={loadProject} />
          </TabsContent>

          <TabsContent value="team">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <Card className="p-4 border border-border md:col-span-2 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Project Members
                  </h2>
                </div>
                
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : membersList.length > 0 ? (
                  <div className="space-y-3">
                    {membersList.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {m.firstName?.[0]}{m.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeMember(m.id)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <p className="text-muted-foreground text-sm">No members assigned to this project yet.</p>
                  </div>
                )}
              </Card>

              <div className="space-y-6">
                <Card className="p-4 border border-border shadow-soft">
                  <h2 className="font-semibold mb-3 text-sm">Invite Team Member by Email</h2>
                  <div className="space-y-3">
                    <Input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="h-9"
                    />
                    <Button className="w-full" onClick={() => addMember()} disabled={inviting || !memberEmail.trim()}>
                      {inviting ? "Sending Invite..." : "Send Invite"}
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 border border-border shadow-soft">
                  <h2 className="font-semibold mb-3 text-sm">Suggested People</h2>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {candidates.length === 0 ? (
                      <p className="text-muted-foreground text-xs text-center py-4">No suggestions available</p>
                    ) : (
                      candidates.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border border-border rounded-lg text-xs">
                          <div className="min-w-0 mr-2">
                            <p className="font-medium truncate">{c.user?.firstName ? `${c.user?.firstName} ${c.user?.lastName}` : c.email}</p>
                            <p className="text-muted-foreground truncate">{c.email}</p>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => addMember(c.email)} disabled={inviting}>Add</Button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <ProjectSettingsTab project={project} onRefresh={loadProject} />
          </TabsContent>
        </Tabs>

        <ProjectLogoUploader
          projectId={project.id}
          currentLogoUrl={project.logoUrl}
          onLogoUpdated={handleLogoUpdated}
          isOpen={isLogoModalOpen}
          onClose={() => setIsLogoModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
