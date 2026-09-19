import { useEffect, useMemo, useState } from "react";
import { Crown, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader, LoadingState } from "@/components/dashboard/DashboardComponents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, CompanyMember, Team, TeamMemberLink } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { canAdminWorkspace, canManageWorkspace } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

type DialogMode = "create" | "edit" | "members" | "lead" | "removeLead" | null;
const memberName = (member?: CompanyMember | null) => member?.user ? `${member.user.firstName} ${member.user.lastName}` : "Unassigned";

const Teams = () => {
  const { activeCompanyId, user, workspaceRole } = useAuth();
  const { toast } = useToast();
  const canManage = canManageWorkspace(workspaceRole, user?.role);
  const canDelete = canAdminWorkspace(workspaceRole, user?.role);
  const [teams, setTeams] = useState<Team[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<CompanyMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [handoverTarget, setHandoverTarget] = useState<TeamMemberLink | null>(null);
  const selectedTeam = teams.find((team) => team.id === selectedId) || null;
  const teamMembers = selectedTeam?.memberLinks || [];
  const availableMembers = useMemo(() => {
    const existing = new Set(teamMembers.map((link) => link.companyMemberId));
    return workspaceMembers.filter((member) => member.status === "active" && !existing.has(member.id));
  }, [teamMembers, workspaceMembers]);
  const replacementMembers = useMemo(() => teamMembers.filter((link) => link.companyMemberId !== handoverTarget?.companyMemberId), [teamMembers, handoverTarget]);

  const load = async () => {
    if (!activeCompanyId) { setTeams([]); setSelectedId(null); setLoading(false); return; }
    try {
      setLoading(true);
      const [teamResponse, memberResponse] = await Promise.all([api.listTeams(), canManage ? api.getCompanyTeam() : Promise.resolve({ data: { members: [] as CompanyMember[] } })]);
      const nextTeams = teamResponse.data.teams || [];
      setTeams(nextTeams); setWorkspaceMembers(memberResponse.data.members || []);
      setSelectedId((current) => nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id || null);
    } catch (error: any) { toast({ title: "Could not load teams", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [activeCompanyId, canManage]);

  const closeDialog = () => { if (!saving) { setDialog(null); setSelectedMemberId(""); setHandoverTarget(null); } };
  const refreshAfter = async (action: () => Promise<unknown>, success: string) => {
    try { setSaving(true); await action(); toast({ title: success }); closeDialog(); await load(); }
    catch (error: any) { toast({ title: "Team update failed", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  const saveTeam = () => {
    if (!name.trim() || (dialog === "edit" && !selectedTeam)) return;
    return refreshAfter(() => dialog === "create" ? api.createTeam({ name: name.trim(), description: description.trim() || undefined }) : api.updateTeam(selectedTeam!.id, { name: name.trim(), description: description.trim() || null }), dialog === "create" ? "Team created" : "Team updated");
  };
  const transferLead = () => selectedTeam && selectedMemberId ? refreshAfter(() => api.assignTeamLead(selectedTeam.id, selectedMemberId, { expectedCurrentLeadMemberId: selectedTeam.leadMemberId || undefined, confirmTransfer: true }), "Team lead updated") : undefined;
  const removeLeadWithHandover = () => selectedTeam && handoverTarget && selectedMemberId ? refreshAfter(() => api.removeTeamMemberFromTeam(selectedTeam.id, handoverTarget.companyMemberId, { replacementCompanyMemberId: selectedMemberId, expectedCurrentLeadMemberId: selectedTeam.leadMemberId || undefined, confirmTransfer: true }), "Leadership transferred and member removed") : undefined;
  const removeMember = (link: TeamMemberLink) => {
    if (!selectedTeam) return;
    if (link.companyMemberId === selectedTeam.leadMemberId) { setHandoverTarget(link); setSelectedMemberId(""); setDialog("removeLead"); return; }
    void refreshAfter(() => api.removeTeamMemberFromTeam(selectedTeam.id, link.companyMemberId), "Member removed");
  };

  return <DashboardLayout><div className="w-full space-y-6">
    <PageHeader title="Teams" description="Organize workspace members into focused teams." actions={canManage ? <Button onClick={() => { setName(""); setDescription(""); setDialog("create"); }} className="gap-2"><Plus className="h-4 w-4" /> Create team</Button> : undefined} />
    {loading ? <LoadingState /> : teams.length === 0 ? <Card><CardContent className="py-16 text-center"><Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-lg font-semibold">No teams yet</h2>{canManage && <Button onClick={() => setDialog("create")} className="mt-5">Create your first team</Button>}</CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit"><CardHeader><CardTitle className="text-base">Workspace teams</CardTitle><CardDescription>{teams.length} team{teams.length === 1 ? "" : "s"}</CardDescription></CardHeader><CardContent className="space-y-2">{teams.map((team) => <button key={team.id} onClick={() => setSelectedId(team.id)} className={`w-full rounded-md border px-3 py-3 text-left ${team.id === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><p className="font-medium">{team.name}</p><p className="mt-1 text-xs text-muted-foreground">{team.memberLinks?.length || 0} members</p></button>)}</CardContent></Card>
      {selectedTeam && <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>{selectedTeam.name}</CardTitle><CardDescription>{selectedTeam.description || "No description provided."}</CardDescription></div>{canManage && <div className="flex gap-2"><Button variant="outline" onClick={() => { setName(selectedTeam.name); setDescription(selectedTeam.description || ""); setDialog("edit"); }}>Edit</Button>{canDelete && <Button variant="destructive" onClick={() => refreshAfter(() => api.deleteTeam(selectedTeam.id), "Team deleted")} aria-label="Delete team"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}</div>}</div></CardHeader><CardContent className="space-y-6"><section><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Team lead</h3>{canManage && <Button variant="outline" size="sm" onClick={() => { setSelectedMemberId(""); setDialog("lead"); }}><Crown className="mr-2 h-4 w-4" /> Change lead</Button>}</div><p className="text-sm text-muted-foreground">{memberName(selectedTeam.leadMember)}{selectedTeam.leadMember && <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Team Lead</span>}</p></section><section><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Members ({teamMembers.length})</h3>{canManage && <Button variant="outline" size="sm" onClick={() => { setSelectedMemberId(""); setDialog("members"); }}><UserPlus className="mr-2 h-4 w-4" /> Add member</Button>}</div><div className="divide-y rounded-md border">{teamMembers.map((link) => <div key={link.id} className="flex items-center justify-between gap-3 p-3"><div><p className="text-sm font-medium">{memberName(link.companyMember)}</p><p className="text-xs text-muted-foreground">{link.companyMember.user.email}</p></div>{canManage && <Button variant="ghost" size="sm" onClick={() => removeMember(link)} title={link.companyMemberId === selectedTeam.leadMemberId ? "Select a replacement lead before removing this member" : undefined}><UserMinus className="mr-2 h-4 w-4" /> Remove</Button>}</div>)}</div></section></CardContent></Card>}
    </div>}
  </div><Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}><DialogContent><DialogHeader><DialogTitle>{dialog === "create" ? "Create team" : dialog === "edit" ? "Edit team" : dialog === "members" ? "Add team member" : dialog === "removeLead" ? "Handover before removing lead" : "Change team lead"}</DialogTitle><DialogDescription>{dialog === "removeLead" ? "The current Team Lead must be replaced before their team membership can be removed. This action transfers leadership and removes the old lead atomically." : dialog === "lead" ? "Select a current team member. Team Lead status does not grant Workspace Admin permissions." : undefined}</DialogDescription></DialogHeader>{(dialog === "create" || dialog === "edit") && <div className="space-y-4"><Label htmlFor="team-name">Team name</Label><Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /><Label htmlFor="team-description">Description</Label><Textarea id="team-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>}{dialog === "members" && <div><Label>Workspace member</Label><Select value={selectedMemberId} onValueChange={setSelectedMemberId}><SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger><SelectContent>{availableMembers.map((member) => <SelectItem key={member.id} value={member.id}>{memberName(member)}</SelectItem>)}</SelectContent></Select></div>}{(dialog === "lead" || dialog === "removeLead") && <div><Label>Replacement Team Lead</Label><Select value={selectedMemberId} onValueChange={setSelectedMemberId}><SelectTrigger><SelectValue placeholder="Select a team member" /></SelectTrigger><SelectContent>{replacementMembers.map((link) => <SelectItem key={link.companyMemberId} value={link.companyMemberId}>{memberName(link.companyMember)}</SelectItem>)}</SelectContent></Select></div>}<DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button>{dialog === "members" && <Button disabled={!selectedMemberId || saving} onClick={() => selectedTeam && refreshAfter(() => api.addTeamMember(selectedTeam.id, selectedMemberId), "Member added")}>Add member</Button>}{dialog === "lead" && <Button disabled={!selectedMemberId || saving} onClick={transferLead}>Confirm lead change</Button>}{dialog === "removeLead" && <Button disabled={!selectedMemberId || saving} onClick={removeLeadWithHandover}>Confirm handover and remove</Button>}{(dialog === "create" || dialog === "edit") && <Button disabled={!name.trim() || saving} onClick={saveTeam}>{dialog === "create" ? "Create team" : "Save changes"}</Button>}</DialogFooter></DialogContent></Dialog></DashboardLayout>;
};

export default Teams;
