import { useEffect, useMemo, useState } from "react";
import { Crown, Plus, Search, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/dashboard/DashboardComponents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, CompanyMember, Team, TeamMemberLink } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { canAdminWorkspace, canManageWorkspace } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import TeamWorkspacePanel from "@/components/teams/TeamWorkspacePanel";

type DialogMode = "create" | "edit" | "lead" | "removeLead" | null;
const memberName = (member?: CompanyMember | null) => member?.user ? `${member.user.firstName} ${member.user.lastName}` : "Unassigned";
const memberInitials = (member?: CompanyMember | null) => {
  if (!member?.user) return "?";
  return `${member.user.firstName?.charAt(0) || ""}${member.user.lastName?.charAt(0) || ""}`.toUpperCase() || "?";
};
const teamInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase() || "T";

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

  const renderMemberRow = (
    key: string,
    member: CompanyMember | null | undefined,
    checked: boolean,
    onToggle: () => void,
    opts?: { disabled?: boolean; isLead?: boolean },
  ) => (
    <label
      key={key}
      className={cn(
        "group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        checked ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60",
        opts?.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={checked} onChange={onToggle} disabled={opts?.disabled} />
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={member?.user?.profilePictureUrl || undefined} alt={memberName(member)} />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{memberInitials(member)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{memberName(member)}</span>
          {opts?.isLead && <Badge variant="secondary" className="shrink-0 gap-1 border-primary/20 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"><Crown className="h-3 w-3" /> Lead</Badge>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{member?.user?.email}</span>
      </span>
    </label>
  );

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <PageHeader
          title="Teams"
          description="Organize workspace members into focused teams."
          actions={canManage ? <Button onClick={() => { setName(""); setDescription(""); setDialog("create"); }} className="gap-2"><Plus className="h-4 w-4" /> Create team</Button> : undefined}
        />

        {loading ? <LoadingState /> : teams.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Crown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">No teams yet</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Teams help you group members, share updates and track assignments together.</p>
              {canManage && <Button onClick={() => setDialog("create")} className="mt-5">Create your first team</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* Column 1 — Teams list */}
            <Card className="h-fit lg:sticky lg:top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workspace teams</CardTitle>
                <CardDescription>{teams.length} team{teams.length === 1 ? "" : "s"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedId(team.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      team.id === selectedId ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60",
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-muted text-xs font-semibold">{teamInitials(team.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{team.name}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{team.memberLinks?.length || 0}</span>
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {selectedTeam && (
              <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                {/* Column 2 — Team details + members */}
                <div className="min-w-0 space-y-6">
                  {/* Team header */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar className="h-12 w-12 shrink-0 rounded-xl">
                            <AvatarFallback className="rounded-xl bg-primary/10 text-base font-semibold text-primary">{teamInitials(selectedTeam.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <CardTitle className="truncate">{selectedTeam.name}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">{selectedTeam.description || "No description provided."}</CardDescription>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{teamMembers.length} member{teamMembers.length === 1 ? "" : "s"}</span>
                            </div>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setName(selectedTeam.name); setDescription(selectedTeam.description || ""); setDialog("edit"); }}>Edit</Button>
                            {canDelete && <Button variant="destructive" size="sm" onClick={() => void refreshAfter(() => api.deleteTeam(selectedTeam.id), "Team deleted")} aria-label="Delete team"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={selectedTeam.leadMember?.user?.profilePictureUrl || undefined} alt={memberName(selectedTeam.leadMember)} />
                            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{memberInitials(selectedTeam.leadMember)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Team Lead</p>
                            <p className="truncate text-sm font-semibold">{memberName(selectedTeam.leadMember)}</p>
                          </div>
                        </div>
                        {canManage && <Button variant="outline" size="sm" onClick={() => { setSelectedMemberIds([]); setDialog("lead"); }}><Crown className="mr-2 h-4 w-4" /> Change lead</Button>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Members manager */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">Members</CardTitle>
                          <CardDescription>
                            {teamMembers.length} in team · {availableMembers.length} available
                            {selectedMemberIds.length > 0 && <span className="ml-1 font-medium text-primary">· {selectedMemberIds.length} selected</span>}
                          </CardDescription>
                        </div>
                        {canManage && (
                          <div className="flex flex-wrap gap-2">
                            <Button variant="default" size="sm" onClick={addSelected} disabled={!selectedMemberIds.length}><UserPlus className="mr-2 h-4 w-4" /> Add selected</Button>
                            <Button variant="outline" size="sm" onClick={removeSelected} disabled={!selectedMemberIds.length}><UserMinus className="mr-2 h-4 w-4" /> Remove selected</Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[200px] flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search members by name or email" className="pl-8" />
                        </div>
                        {canManage && (
                          <div className="flex flex-wrap gap-1">
                            <Button variant="ghost" size="sm" onClick={() => selectAll(filteredAvailable.map((member) => member.id))} disabled={!filteredAvailable.length}>Select available</Button>
                            <Button variant="ghost" size="sm" onClick={() => selectAll(filteredTeamMembers.map((link) => link.companyMemberId))} disabled={!filteredTeamMembers.length}>Select team</Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedMemberIds([])} disabled={!selectedMemberIds.length}>Clear</Button>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Team members column */}
                        <div className="rounded-xl border">
                          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                            <h3 className="text-sm font-semibold">In this team</h3>
                            <span className="text-xs text-muted-foreground">{filteredTeamMembers.length}</span>
                          </div>
                          <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
                            {teamMembers.length === 0 ? (
                              <p className="p-6 text-center text-sm text-muted-foreground">No members yet. Use “Available to add” to invite workspace members.</p>
                            ) : filteredTeamMembers.length === 0 ? (
                              <p className="p-6 text-center text-sm text-muted-foreground">No team members match this search.</p>
                            ) : (
                              filteredTeamMembers.map((link) => renderMemberRow(
                                link.id,
                                link.companyMember,
                                selectedMemberIds.includes(link.companyMemberId),
                                () => canManage && toggleSelected(link.companyMemberId),
                                { disabled: !canManage, isLead: link.companyMemberId === selectedTeam.leadMemberId },
                              ))
                            )}
                          </div>
                        </div>

                        {/* Available members column */}
                        {canManage && (
                          <div className="rounded-xl border border-dashed">
                            <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-2">
                              <h3 className="text-sm font-semibold">Available to add</h3>
                              <span className="text-xs text-muted-foreground">{filteredAvailable.length}</span>
                            </div>
                            <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
                              {filteredAvailable.length === 0 ? (
                                <p className="p-6 text-center text-sm text-muted-foreground">{availableMembers.length === 0 ? "Every active workspace member is already on this team." : "No available members match this search."}</p>
                              ) : (
                                filteredAvailable.map((member) => renderMemberRow(
                                  member.id,
                                  member,
                                  selectedMemberIds.includes(member.id),
                                  () => toggleSelected(member.id),
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Column 3 — Team workspace (chat room, overview, assignments, activity) */}
                <div className="min-w-0 xl:sticky xl:top-6">
                  <TeamWorkspacePanel team={selectedTeam} />
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialog === "create" ? "Create team" : dialog === "edit" ? "Edit team" : dialog === "removeLead" ? "Handover before removing lead" : "Change team lead"}</DialogTitle>
              <DialogDescription>{dialog === "removeLead" ? "The current Team Lead must be replaced before their team membership can be removed." : "Team Lead status does not grant Workspace Admin permissions."}</DialogDescription>
            </DialogHeader>
            {(dialog === "create" || dialog === "edit") && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team name</Label>
                  <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea id="team-description" value={description} onChange={(event) => setDescription(event.target.value)} />
                </div>
              </div>
            )}
            {(dialog === "lead" || dialog === "removeLead") && (
              <div className="space-y-2">
                <Label>Replacement Team Lead</Label>
                <Select value={selectedMemberIds[0] || ""} onValueChange={(value) => setSelectedMemberIds([value])}>
                  <SelectTrigger><SelectValue placeholder="Select a team member" /></SelectTrigger>
                  <SelectContent>
                    {(dialog === "lead" ? teamMembers : replacementMembers).map((link) => (
                      <SelectItem key={link.companyMemberId} value={link.companyMemberId}>{memberName(link.companyMember)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              {dialog === "create" || dialog === "edit"
                ? <Button onClick={() => void saveTeam()} disabled={saving || !name.trim()}>Save</Button>
                : dialog === "lead"
                  ? <Button onClick={transferLead} disabled={saving || !selectedMemberIds[0]}>Save lead</Button>
                  : <Button onClick={removeLeadWithHandover} disabled={saving || !selectedMemberIds[0]}>Transfer and remove</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
