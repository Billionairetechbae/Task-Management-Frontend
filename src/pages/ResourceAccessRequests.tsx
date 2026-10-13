import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api, ResourceAccessRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Inbox, Ban } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ResourceAccessRequests = () => {
  const { workspaceRole } = useAuth();
  const { toast } = useToast();
  const isReviewer =
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager";

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ResourceAccessRequest[]>([]);
  const [activeAccess, setActiveAccess] = useState<ResourceAccessRequest[]>([]);
  const [tab, setTab] = useState<"requests" | "active">("requests");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ResourceAccessRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isReviewer) {
        const [pending, approved] = await Promise.all([
          api.getResourceAccessRequests({ status: "pending" }),
          api.getResourceAccessRequests({ status: "approved" }),
        ]);
        setRequests(pending?.data?.requests || []);
        setActiveAccess(approved?.data?.requests || []);
      } else {
        const res = await api.getMyResourceAccessRequests();
        setRequests(res?.data?.requests || []);
      }
    } catch (e: any) {
      toast({
        title: "Failed to load",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isReviewer, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, status: "approved" | "denied") => {
    setDecidingId(id);
    try {
      await api.decideResourceAccessRequest(id, status);
      toast({ title: status === "approved" ? "Approved" : "Denied" });
      await load();
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setDecidingId(null);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    setDecidingId(revokeTarget.id);
    try {
      await api.revokeResourceAccess(revokeTarget.id);
      setActiveAccess((items) => items.filter((item) => item.id !== revokeTarget.id));
      toast({ title: "Access revoked" });
      setRevokeTarget(null);
    } catch (e: any) {
      toast({ title: "Could not revoke access", description: e?.message || "Please try again", variant: "destructive" });
    } finally { setDecidingId(null); }
  };

  const statusBadge = (s: ResourceAccessRequest["status"]) => {
    if (s === "approved") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Approved</Badge>;
    if (s === "denied") return <Badge variant="destructive">Denied</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {isReviewer ? "Client Access" : "My Access Requests"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isReviewer
                ? "Review and approve external access to projects and tasks."
                : "Track the status of your access requests."}
            </p>
          </div>
        </div>

        {isReviewer && <div className="flex gap-2 border-b"><Button variant={tab === "requests" ? "default" : "ghost"} onClick={() => setTab("requests")}>Requests ({requests.length})</Button><Button variant={tab === "active" ? "default" : "ghost"} onClick={() => setTab("active")}>Active Access ({activeAccess.length})</Button></div>}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (isReviewer ? (tab === "requests" ? requests : activeAccess) : requests).length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
              <Inbox className="w-8 h-8" />
              <p>{isReviewer && tab === "active" ? "No clients currently have approved access." : "No pending access requests."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(isReviewer ? (tab === "requests" ? requests : activeAccess) : requests).map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        {r.requester
                          ? `${r.requester.firstName} ${r.requester.lastName}`
                          : "Unknown user"}
                      </CardTitle>
                      {r.requester?.email && (
                        <p className="text-xs text-muted-foreground">
                          {r.requester.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {r.resourceType}
                      </Badge>
                      {statusBadge(r.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.reason && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      “{r.reason}”
                    </p>
                  )}
                  <p className="text-sm font-medium">{r.resourceTitle || "Shared resource"}</p>
                  <p className="text-[11px] text-muted-foreground">{r.status === "approved" ? `Approved ${r.decidedAt ? new Date(r.decidedAt).toLocaleString() : ""}` : `Requested ${new Date(r.createdAt).toLocaleString()}`} · {r.accessLevel}</p>
                  {r.status === "approved" && r.decidedBy && <p className="text-[11px] text-muted-foreground">Approved by {r.decidedBy.firstName} {r.decidedBy.lastName}</p>}
                  {isReviewer && r.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => decide(r.id, "approved")}
                        disabled={decidingId === r.id}
                        className="gap-1.5"
                      >
                        {decidingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(r.id, "denied")}
                        disabled={decidingId === r.id}
                        className="gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Deny
                      </Button>
                    </div>
                  )}
                  {isReviewer && r.status === "approved" && <Button size="sm" variant="outline" onClick={() => setRevokeTarget(r)} disabled={decidingId === r.id} className="gap-1.5"><Ban className="w-3.5 h-3.5" />Revoke</Button>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Revoke access for {revokeTarget?.requester ? `${revokeTarget.requester.firstName} ${revokeTarget.requester.lastName}` : "this client"}?</AlertDialogTitle><AlertDialogDescription>This person will immediately lose authenticated access to {revokeTarget?.resourceTitle || "this shared resource"}. Their public link access, if still active, is managed separately.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={revoke}>Revoke Access</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </DashboardLayout>
  );
};

export default ResourceAccessRequests;
