import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Clock, MailCheck, Search, ShieldAlert, UserPlus, X } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/dashboard/DashboardComponents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, WorkspaceJoinRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceJoinRequests } from "@/hooks/useWorkspaceJoinRequests";

const nameOf = (request?: WorkspaceJoinRequest | null) => [request?.requester?.firstName, request?.requester?.lastName].filter(Boolean).join(" ") || "Unavailable requester";
const statusClass: Record<string, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  denied: "border-slate-300 bg-slate-50 text-slate-700",
  withdrawn: "border-slate-300 bg-slate-50 text-slate-700",
};

export default function WorkspaceJoinRequests() {
  const { workspaceRole, activeCompanyId, workspaces, setActiveCompanyId, refreshWorkspaces } = useAuth();
  const [workspaceUnavailable, setWorkspaceUnavailable] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "pending");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [selected, setSelected] = useState<WorkspaceJoinRequest | null>(null);
  const [confirm, setConfirm] = useState<"approve" | "decline" | null>(null);
  const [saving, setSaving] = useState(false);
  const permitted = workspaceRole === "owner" || workspaceRole === "admin";
  const requestId = searchParams.get("requestId");
  const requestedWorkspaceId = searchParams.get("workspaceId");
  const queryParams = useMemo(() => ({ status, search: search.trim(), page, pageSize: 10 }), [status, search, page]);
  const query = useWorkspaceJoinRequests(queryParams, permitted && (!requestedWorkspaceId || requestedWorkspaceId === activeCompanyId));

  // Notification/email deep links name a workspace. Switch only to one the user belongs to (after one refresh), never trust the URL.
  useEffect(() => {
    if (!requestedWorkspaceId || requestedWorkspaceId === activeCompanyId) { setWorkspaceUnavailable(false); return; }
    if (workspaces.some((workspace) => workspace.id === requestedWorkspaceId)) { setWorkspaceUnavailable(false); setActiveCompanyId(requestedWorkspaceId); return; }
    let cancelled = false;
    refreshWorkspaces().then((next) => {
      if (cancelled) return;
      if (next.some((workspace) => workspace.id === requestedWorkspaceId)) setActiveCompanyId(requestedWorkspaceId);
      else setWorkspaceUnavailable(true);
    }).catch(() => { if (!cancelled) setWorkspaceUnavailable(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, requestedWorkspaceId]);

  useEffect(() => {
    if (!requestId || !permitted || (requestedWorkspaceId && requestedWorkspaceId !== activeCompanyId)) return;
    api.getWorkspaceJoinRequest(requestId).then((response) => setSelected(response.data.request)).catch(() => setSelected(null));
  }, [activeCompanyId, permitted, requestId, requestedWorkspaceId]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (status === "pending") next.delete("status"); else next.set("status", status);
    if (search.trim()) next.set("search", search.trim()); else next.delete("search");
    if (page === 1) next.delete("page"); else next.set("page", String(page));
    setSearchParams(next, { replace: true });
    // URL state is intentionally derived from controls, not vice versa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page]);

  const decide = async () => {
    if (!selected || !confirm) return;
    setSaving(true);
    try {
      await api.decideWorkspaceJoinRequest(selected.id, confirm);
      toast({ title: confirm === "approve" ? "Member approved" : "Request declined", description: confirm === "approve" ? `${nameOf(selected)} joined as a Member.` : "The requester has been notified." });
      setConfirm(null);
      const refreshed = await api.getWorkspaceJoinRequest(selected.id);
      setSelected(refreshed.data.request);
      await query.refetch();
    } catch (error: any) {
      toast({ title: "Decision could not be saved", description: error?.message || "Refresh and try again.", variant: "destructive" });
      // Already processed elsewhere (another reviewer, withdrawal): show the current state instead of stale actions.
      setConfirm(null);
      api.getWorkspaceJoinRequest(selected.id).then((current) => setSelected(current.data.request)).catch(() => setSelected(null));
      void query.refetch();
    } finally { setSaving(false); }
  };

  if (workspaceUnavailable) return <DashboardLayout><main className="mx-auto max-w-3xl p-6"><Card><CardContent className="flex gap-3 p-6"><ShieldAlert className="h-5 w-5 text-muted-foreground" /><div><h1 className="font-semibold">Workspace unavailable</h1><p className="mt-1 text-sm text-muted-foreground">You do not have access to that workspace, so its join requests cannot be shown.</p><Button className="mt-3" variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button></div></CardContent></Card></main></DashboardLayout>;
  const switching = Boolean(requestedWorkspaceId && requestedWorkspaceId !== activeCompanyId && !workspaceUnavailable);
  if (switching) return <DashboardLayout><main className="mx-auto max-w-3xl p-6"><p role="status" className="text-sm text-muted-foreground">Opening the requested workspace…</p></main></DashboardLayout>;
  if (!permitted) return <DashboardLayout><main className="mx-auto max-w-3xl p-6"><Card><CardContent className="flex gap-3 p-6"><ShieldAlert className="h-5 w-5 text-muted-foreground" /><div><h1 className="font-semibold">Join Requests</h1><p className="mt-1 text-sm text-muted-foreground">Workspace owner or admin access is required.</p></div></CardContent></Card></main></DashboardLayout>;


  const requests = query.data?.requests || [];
  const pagination = query.data?.pagination;
  return <DashboardLayout>
    <div className="space-y-6" aria-live="polite">
      <PageHeader title="Join Requests" description="Workspace Settings · Access & Permissions" />
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-primary" />Workspace admission requests</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search join requests" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or verified email" className="pl-9" /></div>
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}><SelectTrigger aria-label="Filter join requests by status" className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="denied">Declined</SelectItem><SelectItem value="withdrawn">Withdrawn</SelectItem><SelectItem value="all">All statuses</SelectItem></SelectContent></Select>
          </div>
          {query.isPending ? <p className="py-10 text-center text-sm text-muted-foreground">Loading join requests…</p> : query.isError ? <div className="py-10 text-center"><p className="text-sm text-destructive">Join requests could not be loaded.</p><Button variant="outline" className="mt-3" onClick={() => query.refetch()}>Try again</Button></div> : requests.length === 0 ? <div className="rounded-xl border border-dashed py-12 text-center"><Clock className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-medium">No {status === "all" ? "matching" : status} requests</p><p className="mt-1 text-sm text-muted-foreground">New requests will appear here and on the Dashboard.</p></div> : <div className="space-y-2">{requests.map((request) => <button key={request.id} type="button" onClick={() => { setSelected(request); const next = new URLSearchParams(searchParams); next.set("requestId", request.id); setSearchParams(next); }} className="flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{nameOf(request)}</span><Badge variant="outline" className={statusClass[request.status] || ""}>{request.status === "denied" ? "declined" : request.status}</Badge>{request.requester?.emailVerified && <Badge variant="secondary" className="gap-1"><MailCheck className="h-3 w-3" />Verified email</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{request.requester?.email || "Email unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">Requested {new Date(request.createdAt).toLocaleString()} · {request.workspace?.name || "Current workspace"}</p></div><span className="text-sm font-medium text-primary">Review</span></button>)}</div>}
          {pagination && pagination.totalPages > 1 && <div className="mt-4 flex items-center justify-between"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span><Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
        </CardContent>
      </Card>

      {requestId && !selected && !query.isPending && <Card><CardContent className="p-6"><h2 className="font-semibold">Request unavailable</h2><p className="mt-1 text-sm text-muted-foreground">It may have been withdrawn or removed, or you may no longer have access.</p></CardContent></Card>}
      {selected && <Card id="join-request-detail" className="scroll-mt-6"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{nameOf(selected)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{selected.requester?.email}</p></div><Button variant="ghost" size="icon" aria-label="Close request detail" onClick={() => { setSelected(null); const next = new URLSearchParams(searchParams); next.delete("requestId"); setSearchParams(next); }}><X className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-4"><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Status</dt><dd className="mt-1 capitalize">{selected.status === "denied" ? "Declined" : selected.status}</dd></div><div><dt className="text-muted-foreground">Requested</dt><dd className="mt-1">{new Date(selected.createdAt).toLocaleString()}</dd></div><div><dt className="text-muted-foreground">Account</dt><dd className="mt-1">{selected.requester?.isActive ? "Active" : "Inactive"} · {selected.requester?.emailVerified ? "Email verified" : "Email not verified"}</dd></div><div><dt className="text-muted-foreground">Workspace</dt><dd className="mt-1">{selected.workspace?.name || "Current workspace"}</dd></div>{selected.message && <div className="sm:col-span-2"><dt className="text-muted-foreground">Message</dt><dd className="mt-1 whitespace-pre-wrap">{selected.message}</dd></div>}{selected.decidedAt && <div><dt className="text-muted-foreground">Decision time</dt><dd className="mt-1">{new Date(selected.decidedAt).toLocaleString()}</dd></div>}{selected.decidedBy && <div><dt className="text-muted-foreground">Decided by</dt><dd className="mt-1">{[selected.decidedBy.firstName, selected.decidedBy.lastName].filter(Boolean).join(" ")}</dd></div>}</dl>{selected.status === "pending" && <div className="flex flex-wrap gap-2 border-t pt-4"><Button disabled={saving || !selected.requester?.isActive} onClick={() => setConfirm("approve")}><Check className="mr-1 h-4 w-4" />Approve as Member</Button><Button disabled={saving} variant="outline" onClick={() => setConfirm("decline")}><X className="mr-1 h-4 w-4" />Decline</Button></div>}</CardContent></Card>}
    </div>
    <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm === "approve" ? "Approve workspace membership?" : "Decline this request?"}</AlertDialogTitle><AlertDialogDescription>{confirm === "approve" ? `${nameOf(selected)} will join as a Member. Team and restricted Project access remain separate.` : "The requester will receive a neutral outcome notification."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void decide(); }}>{saving ? "Saving…" : confirm === "approve" ? "Approve" : "Decline"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </DashboardLayout>;
}
