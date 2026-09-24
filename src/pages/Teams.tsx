import { useEffect, useMemo, useState } from "react";
import { Crown, Plus, Search, Trash2, UserMinus, UserPlus } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/dashboard/DashboardComponents";
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
import TeamWorkspacePanel from "@/components/teams/TeamWorkspacePanel";

type DialogMode = "create" | "edit" | "lead" | "removeLead" | null;
const memberName = (member?: CompanyMember | null) => member?.user ? `${member.user.firstName} ${member.user.lastName}` : "Unassigned";

export default function Teams() {
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
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [handoverTarget, setHandoverTarget] = useState<TeamMemberLink | null>(null);

  const selectedTeam = teams.find((team) => team.id === selectedId) || null;
  const teamMembers = selectedTeam?.memberLinks || [];
  const existingIds = useMemo(() => new Set(teamMembers.map((link) => link.companyMemberId)), [teamMembers]);
  const availableMembers = useMemo(() => workspaceMembers.filter((member) => member.status === "active" && !existingIds.has(member.id)), [workspaceMembers, existingIds]);
  const filteredAvailable = useMemo(() => availableMembers.filter((member) => {
    const query = memberSearch.toLowerCase();
    return memberName(member).toLowerCase().includes(query) || member.user?.email?.toLowerCase().includes(query);
  }), [availableMembers, memberSearch]);
  const filteredTeamMembers = useMemo(() => teamMembers.filter((link) => {
    const query = memberSearch.toLowerCase();
    return memberName(link.companyMember).toLowerCase().includes(query) || link.companyMember?.user?.email?.toLowerCase().includes(query);
  }), [teamMembers, memberSearch]);
  const replacementMembers = useMemo(() => teamMembers.filter((link) => link.companyMemberId !== handoverTarget?.companyMemberId), [teamMembers, handoverTarget]);

  const load = async () => {
    if (!activeCompanyId) { setTeams([]); setSelectedId(null); setLoading(false); return; }
    try {
      setLoading(true);
      const [teamResponse, memberResponse] = await Promise.all([
        api.listTeams(),
        canManage ? api.getCompanyTeam() : Promise.resolve({ data: { members: [] as CompanyMember[] } }),
      ]);
      const nextTeams = teamResponse.data.teams || [];
      setTeams(nextTeams);
      setWorkspaceMembers(memberResponse.data.members || []);
      setSelectedId((current) => nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id || null);
    } catch (error: any) {
      toast({ title: "Could not load teams", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [activeCompanyId, canManage]);
  useEffect(() => { setSelectedMemberIds([]); setMemberSearch(""); }, [selectedId]);

  const closeDialog = () => {
    if (!saving) { setDialog(null); setSelectedMemberIds([]); setHandoverTarget(null); }
  };
  const refreshAfter = async (action: () => Promise<unknown>, success: string) => {
    try { setSaving(true); await action(); toast({ title: success }); closeDialog(); await load(); }
    catch (error: any) { toast({ title: "Team update failed", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  const toggleSelected = (id: string) => setSelectedMemberIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const addSelected = () => selectedTeam && selectedMemberIds.length ? void refreshAfter(() => api.addTeamMembers(selectedTeam.id, selectedMemberIds), `${selectedMemberIds.length} member${selectedMemberIds.length === 1 ? "" : "s"} added`) : undefined;
  const removeSelected = () => {
    if (!selectedTeam || !selectedMemberIds.length) return;
    if (selectedTeam.leadMemberId && selectedMemberIds.includes(selectedTeam.leadMemberId)) {
      toast({ title: "Transfer Team Lead first", description: "The current Team Lead cannot be removed in a bulk action.", variant: "destructive" });
      return;
    }
    void refreshAfter(() => api.removeTeamMembers(selectedTeam.id, selectedMemberIds), `${selectedMemberIds.length} member${selectedMemberIds.length === 1 ? "" : "s"} removed`);
  };
  const selectAll = (ids: string[]) => setSelectedMemberIds(ids);
  const saveTeam = () => {
    if (!name.trim() || (dialog === "edit" && !selectedTeam)) return;
    return refreshAfter(() => dialog === "create"
      ? api.createTeam({ name: name.trim(), description: description.trim() || undefined })
      : api.updateTeam(selectedTeam!.id, { name: name.trim(), description: description.trim() || null }), dialog === "create" ? "Team created" : "Team updated");
  };
  const transferLead = () => selectedTeam && selectedMemberIds[0] ? void refreshAfter(() => api.assignTeamLead(selectedTeam.id, selectedMemberIds[0], { expectedCurrentLeadMemberId: selectedTeam.leadMemberId || undefined, confirmTransfer: true }), "Team lead updated") : undefined;
  const removeLeadWithHandover = () => selectedTeam && handoverTarget && selectedMemberIds[0] ? void refreshAfter(() => api.removeTeamMemberFromTeam(selectedTeam.id, handoverTarget.companyMemberId, { replacementCompanyMemberId: selectedMemberIds[0], expectedCurrentLeadMemberId: selectedTeam.leadMemberId || undefined, confirmTransfer: true }), "Leadership transferred and member removed") : undefined;

  if (!activeCompanyId) return <DashboardLayout><EmptyState icon={Crown} title="Choose a workspace" description="Select a workspace to manage teams." /></DashboardLayout>;
  return <DashboardLayout><div className="w-full space-y-6">
    <PageHeader title="Teams" description="Organize workspace members into focused teams." actions={canManage ? <Button onClick={() => { setName(""); setDescription(""); setDialog("create"); }} className="gap-2"><Plus className="h-4 w-4" /> Create team</Button> : undefined} />
    {loading ? <LoadingState /> : teams.length === 0 ? <Card><CardContent className="py-16 text-center"><Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-lg font-semibold">No teams yet</h2>{canManage && <Button onClick={() => setDialog("create")} className="mt-5">Create your first team</Button>}</CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit"><CardHeader><CardTitle className="text-base">Workspace teams</CardTitle><CardDescription>{teams.length} team{teams.length === 1 ? "" : "s"}</CardDescription></CardHeader><CardContent className="space-y-2">{teams.map((team) => <button key={team.id} onClick={() => setSelectedId(team.id)} className={`w-full rounded-md border px-3 py-3 text-left ${team.id === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><p className="font-medium">{team.name}</p><p className="mt-1 text-xs text-muted-foreground">{team.memberLinks?.length || 0} members</p></button>)}</CardContent></Card>
      {selectedTeam && <div className="space-y-6"><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>{selectedTeam.name}</CardTitle><CardDescription>{selectedTeam.description || "No description provided."}</CardDescription></div>{canManage && <div className="flex gap-2"><Button variant="outline" onClick={() => { setName(selectedTeam.name); setDescription(selectedTeam.description || ""); setDialog("edit"); }}>Edit</Button>{canDelete && <Button variant="destructive" onClick={() => void refreshAfter(() => api.deleteTeam(selectedTeam.id), "Team deleted")} aria-label="Delete team"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}</div>}</div></CardHeader><CardContent className="space-y-6">
        <section><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Team lead</h3>{canManage && <Button variant="outline" size="sm" onClick={() => { setSelectedMemberIds([]); setDialog("lead"); }}><Crown className="mr-2 h-4 w-4" /> Change lead</Button>}</div><p className="text-sm text-muted-foreground">{memberName(selectedTeam.leadMember)}{selectedTeam.leadMember && <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Team Lead</span>}</p></section>
        <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Members ({teamMembers.length})</h3><p className="text-xs text-muted-foreground">{selectedMemberIds.length} selected</p></div>{canManage && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={addSelected} disabled={!selectedMemberIds.length}><UserPlus className="mr-2 h-4 w-4" /> Add selected</Button><Button variant="outline" size="sm" onClick={removeSelected} disabled={!selectedMemberIds.length}><UserMinus className="mr-2 h-4 w-4" /> Remove selected</Button></div>}</div>
          <div className="mb-3 flex flex-wrap items-center gap-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search workspace or team members" className="pl-8" /></div>{canManage && <><Button variant="ghost" size="sm" onClick={() => selectAll(filteredAvailable.map((member) => member.id))} disabled={!filteredAvailable.length}>Select all available</Button><Button variant="ghost" size="sm" onClick={() => selectAll(filteredTeamMembers.map((link) => link.companyMemberId))} disabled={!filteredTeamMembers.length}>Select all members</Button><Button variant="ghost" size="sm" onClick={() => setSelectedMemberIds([])} disabled={!selectedMemberIds.length}>Clear</Button></>}</div>
          {canManage && filteredAvailable.length > 0 && <div className="mb-4 rounded-md border border-dashed p-3"><p className="mb-2 text-xs font-medium text-muted-foreground">Available workspace members ({filteredAvailable.length})</p><div className="grid gap-2 md:grid-cols-2">{filteredAvailable.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"><input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={() => toggleSelected(member.id)} /><span className="min-w-0"><span className="block text-sm font-medium">{memberName(member)}</span><span className="block truncate text-xs text-muted-foreground">{member.user?.email}</span></span></label>)}</div></div>}
          {teamMembers.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No members yet. Select available workspace members above to add them.</p> : filteredTeamMembers.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No team members match this search.</p> : <div className="divide-y rounded-md border">{filteredTeamMembers.map((link) => <label key={link.id} className="flex items-center justify-between gap-3 p-3"><span className="flex min-w-0 items-center gap-3"><input type="checkbox" checked={selectedMemberIds.includes(link.companyMemberId)} onChange={() => canManage && toggleSelected(link.companyMemberId)} disabled={!canManage} /><span className="min-w-0"><span className="block text-sm font-medium">{memberName(link.companyMember)}{link.companyMemberId === selectedTeam.leadMemberId && <span className="ml-2 text-xs text-primary">Team Lead</span>}</span><span className="block truncate text-xs text-muted-foreground">{link.companyMember?.user?.email}</span></span></span>{canManage && link.companyMemberId === selectedTeam.leadMemberId && <Crown className="h-4 w-4 text-primary" />}</label>)}</div>}
        </section>
      </CardContent></Card><TeamWorkspacePanel team={selectedTeam} /></div>}
    </div>}
    <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}><DialogContent><DialogHeader><DialogTitle>{dialog === "create" ? "Create team" : dialog === "edit" ? "Edit team" : dialog === "removeLead" ? "Handover before removing lead" : "Change team lead"}</DialogTitle><DialogDescription>{dialog === "removeLead" ? "The current Team Lead must be replaced before their team membership can be removed." : "Team Lead status does not grant Workspace Admin permissions."}</DialogDescription></DialogHeader>{(dialog === "create" || dialog === "edit") && <div className="space-y-4"><Label htmlFor="team-name">Team name</Label><Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /><Label htmlFor="team-description">Description</Label><Textarea id="team-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>}{(dialog === "lead" || dialog === "removeLead") && <div><Label>Replacement Team Lead</Label><Select value={selectedMemberIds[0] || ""} onValueChange={(value) => setSelectedMemberIds([value])}><SelectTrigger><SelectValue placeholder="Select a team member" /></SelectTrigger><SelectContent>{(dialog === "lead" ? teamMembers : replacementMembers).map((link) => <SelectItem key={link.companyMemberId} value={link.companyMemberId}>{memberName(link.companyMember)}</SelectItem>)}</SelectContent></Select></div>}<DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button>{dialog === "create" || dialog === "edit" ? <Button onClick={() => void saveTeam()} disabled={saving || !name.trim()}>Save</Button> : dialog === "lead" ? <Button onClick={transferLead} disabled={saving || !selectedMemberIds[0]}>Save lead</Button> : <Button onClick={removeLeadWithHandover} disabled={saving || !selectedMemberIds[0]}>Transfer and remove</Button>}</DialogFooter></DialogContent></Dialog>
  </div></DashboardLayout>;
}
