import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, MyWorkspaceJoinRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { myJoinRequestKey, useMyWorkspaceJoinRequests } from "@/hooks/useWorkspaceJoinRequests";

const LABEL: Record<string, string> = { pending: "Pending approval", approved: "Approved", denied: "Declined", withdrawn: "Withdrawn" };
const STYLE: Record<string, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  denied: "border-slate-300 bg-slate-50 text-slate-700",
  withdrawn: "border-slate-300 bg-slate-50 text-slate-700",
};

/** The requester's own request states. Shows no reviewer identities; a pending request can be withdrawn. */
export function MyJoinRequests({ onOpenWorkspace }: { onOpenWorkspace?: (workspaceId: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const query = useMyWorkspaceJoinRequests();
  const [withdrawing, setWithdrawing] = useState<MyWorkspaceJoinRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const requests = query.data?.requests || [];

  const withdraw = async () => {
    if (!withdrawing) return;
    setBusy(true);
    try {
      await api.withdrawWorkspaceJoinRequest(withdrawing.id);
      toast({ title: "Request withdrawn" });
    } catch (error: any) {
      toast({ title: "Could not withdraw", description: error?.message || "It may already have been decided.", variant: "destructive" });
    } finally {
      setBusy(false);
      setWithdrawing(null);
      await queryClient.invalidateQueries({ queryKey: myJoinRequestKey() });
    }
  };

  if (query.isPending) return <p className="mt-4 text-sm text-muted-foreground" role="status">Loading your requests…</p>;
  if (query.isError) return <p className="mt-4 text-sm text-destructive" role="alert">Your join requests could not be loaded. <button type="button" className="underline" onClick={() => query.refetch()}>Try again</button></p>;
  if (!requests.length) return null;

  return <Card className="mt-4" data-testid="my-join-requests">
    <CardHeader className="pb-3"><CardTitle className="text-base">Your join requests</CardTitle></CardHeader>
    <CardContent><ul className="space-y-2" aria-live="polite">{requests.map((request) => {
      return <li key={request.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium">{request.workspace?.name || "Workspace"}</p><p className="text-xs text-muted-foreground">Requested {new Date(request.createdAt).toLocaleDateString()}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={STYLE[request.status] || ""}>{LABEL[request.status] || request.status}</Badge>
          {request.status === "pending" && <Button size="sm" variant="outline" onClick={() => setWithdrawing(request)}>Withdraw</Button>}
          {request.status === "approved" && onOpenWorkspace && <Button size="sm" onClick={() => onOpenWorkspace(request.companyId)}>Open workspace</Button>}
        </div>
      </li>;
    })}</ul></CardContent>
    <AlertDialog open={Boolean(withdrawing)} onOpenChange={(open) => !open && setWithdrawing(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Withdraw this request?</AlertDialogTitle><AlertDialogDescription>{`Your request to join ${withdrawing?.workspace?.name || "this workspace"} will be cancelled. You can send a new request later.`}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep request</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void withdraw(); }}>{busy ? "Withdrawing…" : "Withdraw"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </Card>;
}
