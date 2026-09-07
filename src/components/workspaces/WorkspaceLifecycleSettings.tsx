import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, Trash2, Upload } from "lucide-react";
import { api, ApiError, CompanyMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const friendlyError = (error: unknown) => {
  if (!(error instanceof ApiError)) return "We couldn't complete this action. Please try again.";
  if (error.statusCode === 403) return "You don't have permission to perform this action.";
  if (error.statusCode === 404) return "This item no longer exists.";
  if (error.statusCode === 400) return "Check the confirmation details and try again.";
  if (error.statusCode === 409) return "This action conflicts with the workspace's current state. Refresh and try again.";
  if (error.statusCode === 429) return "Too many attempts. Please try again shortly.";
  return error.statusCode >= 500 ? "We couldn't complete this action. Please try again." : error.message;
};

const WorkspaceLifecycleSettings = () => {
  const { activeCompanyId, activeWorkspace, workspaceRole, user, refreshWorkspaces } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeLogoOpen, setRemoveLogoOpen] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const canManageLogo = workspaceRole === "owner" || workspaceRole === "admin";
  const isOwner = workspaceRole === "owner";

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  useEffect(() => {
    if (!leaveOpen || !isOwner) return;
    api.getCompanyTeam().then((response) => {
      const list = response.data?.members || response.data?.team_members || [];
      setMembers(list.filter((member: CompanyMember) => member.status === "active" && member.userId !== user?.id));
    }).catch(() => setMembers([]));
  }, [leaveOpen, isOwner, user?.id]);

  const eligibleMembers = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase();
    return members.filter((member) => `${member.user.firstName} ${member.user.lastName} ${member.user.email}`.toLocaleLowerCase().includes(query));
  }, [members, memberSearch]);

  const finishWorkspaceRemoval = async () => {
    const remaining = await refreshWorkspaces();
    queryClient.removeQueries({ predicate: (query) => query.queryKey.includes(activeCompanyId) });
    navigate(remaining.length ? "/dashboard" : "/onboarding/workspace", { replace: true });
  };

  const submitLeave = async () => {
    if (!activeCompanyId) return;
    setBusy(true);
    try {
      await api.leaveWorkspace(activeCompanyId, isOwner ? { newOwnerUserId: newOwnerId, confirmHandover: true } : undefined);
      await finishWorkspaceRemoval();
      setLeaveOpen(false);
      toast({ title: isOwner ? "Ownership transferred and workspace left." : "You left the workspace." });
    } catch (error) { toast({ title: "Unable to leave workspace", description: friendlyError(error), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const submitDelete = async () => {
    if (!activeCompanyId) return;
    setBusy(true);
    try {
      await api.deleteWorkspace(activeCompanyId, deleteName);
      await finishWorkspaceRemoval();
      setDeleteOpen(false);
      toast({ title: "Workspace moved to Trash." });
    } catch (error) { toast({ title: "Unable to delete workspace", description: friendlyError(error), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const chooseLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: "Invalid logo", description: file.size > 5 * 1024 * 1024 ? "Logo must be 5 MiB or smaller." : "Choose a JPEG, PNG, WebP, or GIF image.", variant: "destructive" });
      event.target.value = "";
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async () => {
    if (!activeCompanyId || !logoFile) return;
    setBusy(true);
    try { await api.uploadWorkspaceLogo(activeCompanyId, logoFile); await refreshWorkspaces(); setLogoFile(null); setLogoPreview(null); toast({ title: "Workspace logo updated." }); }
    catch (error) { toast({ title: "Logo upload failed", description: friendlyError(error), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const removeLogo = async () => {
    if (!activeCompanyId) return;
    setBusy(true);
    try { await api.removeWorkspaceLogo(activeCompanyId); await refreshWorkspaces(); setRemoveLogoOpen(false); toast({ title: "Workspace logo removed." }); }
    catch (error) { toast({ title: "Logo removal failed", description: friendlyError(error), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const logo = logoPreview || activeWorkspace?.logoUrl || activeWorkspace?.company?.logoUrl || null;
  const initials = activeWorkspace?.name?.slice(0, 2).toUpperCase() || "WS";

  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle>Workspace logo</CardTitle><CardDescription>Shown in the sidebar and workspace switcher.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20"><AvatarImage src={logo || undefined} alt="Workspace logo" /><AvatarFallback>{initials}</AvatarFallback></Avatar>
        {canManageLogo ? <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={chooseLogo} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />{logo ? "Change logo" : "Upload logo"}</Button>
          {logoFile && <Button onClick={uploadLogo} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Upload</Button>}
          {(activeWorkspace?.logoUrl || activeWorkspace?.company?.logoUrl) && <Button variant="outline" onClick={() => setRemoveLogoOpen(true)} disabled={busy}>Remove logo</Button>}
        </div> : <p className="text-sm text-muted-foreground">Only workspace owners and admins can change the logo.</p>}
      </CardContent>
    </Card>

    <Card className="border-destructive/50">
      <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle><CardDescription>Changes here affect your access to this workspace.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Leave workspace</p><p className="text-sm text-muted-foreground">You will lose access to its projects, tasks and files.</p></div><Button variant="outline" onClick={() => setLeaveOpen(true)}><LogOut className="mr-2 h-4 w-4" />Leave workspace</Button></div>
        {isOwner && <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Delete workspace</p><p className="text-sm text-muted-foreground">Move this workspace and its content to Trash for 30 days.</p></div><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete workspace</Button></div>}
      </CardContent>
    </Card>

    <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{isOwner ? "Transfer ownership before leaving" : "Leave workspace?"}</DialogTitle><DialogDescription>{isOwner ? "You are the owner of this workspace. Choose another active member to become the new owner before you leave." : "Are you sure you want to leave this workspace? You will lose access to its projects, tasks and files."}</DialogDescription></DialogHeader>
      {isOwner && (members.length ? <div className="space-y-3"><Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members..." aria-label="Search members" /><div className="max-h-52 space-y-1 overflow-y-auto">{eligibleMembers.map((member) => <button type="button" key={member.userId} onClick={() => setNewOwnerId(member.userId)} className={`w-full rounded-md border p-3 text-left text-sm ${newOwnerId === member.userId ? "border-primary bg-primary/5" : ""}`}><span className="block font-medium">{member.user.firstName} {member.user.lastName}</span><span className="text-muted-foreground">{member.user.email}</span></button>)}</div><label className="flex items-start gap-2 text-sm"><Checkbox checked={handoverConfirmed} onCheckedChange={(checked) => setHandoverConfirmed(checked === true)} />I understand that the selected member will become the new workspace owner.</label></div> : <p className="rounded-md bg-muted p-3 text-sm">You must add another member before you can transfer ownership and leave.</p>)}
      <DialogFooter><Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button><Button variant="destructive" disabled={busy || (isOwner && (!newOwnerId || !handoverConfirmed))} onClick={submitLeave}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isOwner ? "Transfer ownership and leave" : "Leave workspace"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogHeader><DialogTitle>Delete workspace?</DialogTitle><DialogDescription>Deleting this workspace will remove it for every member and move its projects, tasks, comments, files and other workspace content to Trash. The workspace can be restored for 30 days. After 30 days, it will be permanently deleted. All workspace members will lose access immediately.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="delete-workspace-name">Type {activeWorkspace?.name} to confirm</Label><Input id="delete-workspace-name" value={deleteName} onChange={(e) => setDeleteName(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" disabled={busy || deleteName !== activeWorkspace?.name} onClick={submitDelete}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Move workspace to Trash</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={removeLogoOpen} onOpenChange={setRemoveLogoOpen}><DialogContent><DialogHeader><DialogTitle>Remove workspace logo?</DialogTitle><DialogDescription>The workspace will use its initials instead.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setRemoveLogoOpen(false)}>Cancel</Button><Button variant="destructive" onClick={removeLogo} disabled={busy}>Remove logo</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};

export default WorkspaceLifecycleSettings;
