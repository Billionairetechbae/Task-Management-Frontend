import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus, RefreshCw, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, ExternalShare, ExternalSharePermission, ExternalShareResourceType } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ExternalShareResourceType;
  resourceId: string;
  resourceName: string;
  /** Project shares only: tasks the owner may choose to make client-visible. Nothing is visible by default. */
  projectTasks?: Array<{ id: string; title: string }>;
}

const statusLabel = (s: ExternalShare) => (s.expired ? "Expired" : s.status === "pending" ? "Invited" : "Has access");

/** Share → Invite external client. External clients get no Admiino account, membership or seat; backend enforces who may share. */
const ExternalShareDialog = ({ open, onOpenChange, resourceType, resourceId, resourceName, projectTasks = [] }: Props) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<ExternalSharePermission>("commenter");
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [shares, setShares] = useState<ExternalShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setShares((await api.listExternalShares(resourceType, resourceId)).data.shares);
    } catch (e) {
      toast({ title: "Could not load collaborators", description: (e as Error)?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId, toast]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const send = async () => {
    if (sending || !email.trim()) return;
    setSending(true);
    try {
      const res = await api.createExternalShare({
        resourceType, resourceId, email: email.trim(), permission,
        ...(message.trim() ? { message: message.trim() } : {}),
        ...(resourceType === "project" ? { visibleTaskIds: visible } : {}),
      });
      toast(res.data.emailSent
        ? { title: "Invitation sent", description: `${email.trim()} can open this ${resourceType} from their email.` }
        : { title: "Access created, email not delivered", description: "Use Resend to try again.", variant: "destructive" });
      setEmail(""); setMessage("");
      await load();
    } catch (e) {
      toast({ title: "Could not send invitation", description: (e as Error)?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const act = async (id: string, fn: () => Promise<unknown>, okTitle: string) => {
    setBusyId(id);
    try { await fn(); toast({ title: okTitle }); await load(); }
    catch (e) { toast({ title: "Action failed", description: (e as Error)?.message, variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite external client</DialogTitle>
          <DialogDescription>
            Share: <span className="font-medium text-foreground">{resourceName}</span>. They open it from email — no Admiino account needed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ext-email">Client email address</Label>
            <Input id="ext-email" type="email" autoComplete="off" placeholder="client@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ext-permission">Permission</Label>
            <Select value={permission} onValueChange={(v) => setPermission(v as ExternalSharePermission)}>
              <SelectTrigger id="ext-permission"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer — can read</SelectItem>
                <SelectItem value="commenter">Commenter — can read and comment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {resourceType === "project" && (
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-medium">Tasks visible to the client</legend>
              <p className="text-xs text-muted-foreground">Only ticked tasks are shown. Nothing else in the project is exposed.</p>
              {projectTasks.length === 0 ? <p className="text-xs text-muted-foreground">This project has no tasks.</p> : (
                <div className="max-h-32 overflow-y-auto rounded-md border p-2 grid gap-1.5">
                  {projectTasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={visible.includes(t.id)} onCheckedChange={(c) => setVisible((prev) => (c ? [...prev, t.id] : prev.filter((x) => x !== t.id)))} />
                      <span className="truncate">{t.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ext-message">Message (optional)</Label>
            <Textarea id="ext-message" rows={2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button onClick={send} disabled={sending || !email.trim()} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Send invitation
          </Button>
        </div>

        <div className="border-t pt-3">
          <h3 className="text-sm font-semibold mb-2">People with access</h3>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground">No external clients yet.</p>
          ) : (
            <ul className="grid gap-2">
              {shares.map((s) => (
                <li key={s.id} className="rounded-md border p-2 grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm break-all">{s.email}</span>
                    <Badge variant={s.expired ? "destructive" : "outline"} className="text-[10px]">{statusLabel(s)}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={s.permission} disabled={busyId === s.id} onValueChange={(v) => act(s.id, () => api.updateExternalShare(s.id, { permission: v as ExternalSharePermission }), "Permission updated")}>
                      <SelectTrigger className="h-8 w-[130px] text-xs" aria-label={`Permission for ${s.email}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="commenter">Commenter</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={busyId === s.id} onClick={() => act(s.id, () => api.resendExternalShare(s.id), "Invitation resent")}>
                      <RefreshCw className="h-3 w-3" /> Resend
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-destructive" disabled={busyId === s.id} onClick={() => act(s.id, () => api.revokeExternalShare(s.id), "Access revoked")}>
                      <Ban className="h-3 w-3" /> Revoke
                    </Button>
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {s.expiresAt ? `Expires ${new Date(s.expiresAt).toLocaleDateString()}` : "No expiry"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalShareDialog;
