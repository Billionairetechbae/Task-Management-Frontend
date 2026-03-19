import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project, Task, ProjectInvite } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ProjectDetails() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberAdding, setMemberAdding] = useState(false);
  const [emailList, setEmailList] = useState("");
  const [inviting, setInviting] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [includeExternal, setIncludeExternal] = useState(true);
  const [membersList, setMembersList] = useState<Array<{ id: string; role: string; status: string; firstName: string; lastName: string; email: string }>>([]);
  const [invitesList, setInvitesList] = useState<ProjectInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getProjectById(id);
      const p = (res as any)?.data?.project || (res as any)?.project;
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

  const addMember = async () => {
    if (!id || !memberUserId.trim()) return;
    try {
      setMemberAdding(true);
      await api.addProjectMember(id, memberUserId, "member");
      setMemberUserId("");
      await Promise.all([load(), loadMembers()]);
      toast({ title: "Member added" });
    } catch (err: any) {
      toast({ title: "Add failed", description: err.message, variant: "destructive" });
    } finally {
      setMemberAdding(false);
    }
  };

  const inviteByEmails = async () => {
    if (!id) return;
    const emails = emailList.split(",").map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    try {
      setInviting(true);
      await api.inviteProjectMembersByEmails(id, emails, "member");
      setEmailList("");
      await Promise.all([load(), loadMembers()]);
      toast({ title: "Invites sent" });
    } catch (err: any) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
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

  const addCandidate = async (candidate: any) => {
    if (!id) return;
    try {
      if (candidate.isExternal && candidate.email) {
        await api.inviteProjectMembersByEmails(id, [candidate.email], "member");
      } else if (candidate.userId) {
        await api.addProjectMember(id, candidate.userId, "member");
      } else if (candidate.email) {
        await api.inviteProjectMembersByEmails(id, [candidate.email], "member");
      }
      await Promise.all([load(), loadMembers(), loadCandidates()]);
      toast({ title: "Added" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
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
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const resendInvite = async (inviteId: string) => {
    if (!id) return;
    try {
      await api.resendProjectInvite(id, inviteId);
      await loadMembers();
      toast({ title: "Invite resent" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    Promise.all([load(), loadMembers()]);
  }, [id]);

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, includeExternal]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {!loading && !project && <p className="text-muted-foreground">Project not found</p>}
        {!loading && project && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-sm text-muted-foreground capitalize">{project.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-4 border border-border md:col-span-2">
                <h2 className="font-semibold mb-3">Tasks</h2>
                {project.tasks && project.tasks.length > 0 ? (
                  <div className="space-y-3">
                    {project.tasks.map((t: Task) => (
                      <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{t.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No tasks linked</p>
                )}
              </Card>

              <Card className="p-4 border border-border">
                <h2 className="font-semibold mb-3">Members</h2>
                {loadingMembers ? (
                  <p className="text-sm text-muted-foreground">Loading members...</p>
                ) : membersList.length > 0 ? (
                  <ul className="space-y-2">
                    {membersList.map((m) => (
                      <li key={m.id} className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">{m.firstName} {m.lastName}</span>
                          <span className="text-muted-foreground ml-2 capitalize">{m.role}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => removeMember(m.id)}>Remove</Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No members</p>
                )}

                <div className="mt-4 flex gap-2">
                  <Input value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} placeholder="User ID to add" />
                  <Button onClick={addMember} disabled={memberAdding || !memberUserId.trim()}>Add</Button>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2 text-sm">Invite by email</h3>
                  <div className="flex gap-2">
                    <Input value={emailList} onChange={(e) => setEmailList(e.target.value)} placeholder="Comma-separated emails" />
                    <Button onClick={inviteByEmails} disabled={inviting || !emailList.trim()}>Invite</Button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Suggested people</h3>
                    <label className="text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeExternal}
                        onChange={(e) => setIncludeExternal(e.target.checked)}
                      />
                      Include external
                    </label>
                  </div>
                  {candidates.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No suggestions</p>
                  ) : (
                    <ul className="space-y-2">
                      {candidates.map((c, idx) => (
                        <li key={idx} className="flex items-center justify-between border rounded-lg p-2">
                          <div className="text-sm">
                            <span className="font-medium">{c.name || c.user?.firstName ? `${c.user?.firstName} ${c.user?.lastName}` : c.email}</span>
                            {c.email && <span className="text-muted-foreground ml-2">{c.email}</span>}
                            {c.isExternal && <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">external</span>}
                          </div>
                          <Button size="sm" onClick={() => addCandidate(c)}>Add</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold mb-2 text-sm">Pending invites</h3>
                  {invitesList.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No pending invites</p>
                  ) : (
                    <ul className="space-y-2">
                      {invitesList.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between border rounded-lg p-2">
                          <div className="text-sm">
                            <span className="font-medium">{inv.email}</span>
                            <span className="text-muted-foreground ml-2 capitalize">{inv.role}</span>
                            <span className="ml-2 text-xs">{inv.status}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => revokeInvite(inv.id)}>Revoke</Button>
                            <Button size="sm" onClick={() => resendInvite(inv.id)}>Resend</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
