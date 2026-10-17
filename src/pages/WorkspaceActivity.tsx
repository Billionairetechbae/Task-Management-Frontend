import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronLeft, ChevronRight, CircleHelp, Clock3, ExternalLink, FilterX, Search, ShieldAlert } from "lucide-react";
import { api, OrganizationAuditEvent } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const CATEGORIES = ["workspace", "membership", "project", "task", "team", "custom_field", "template", "integration", "client_access", "settings"];
const ENTITY_TYPES = ["workspace", "member", "project", "task", "team", "custom_field", "template", "integration", "client"];
const humanize = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const changeLabel = (value: unknown) => {
  if (value == null) return "—";
  const text = String(value);
  // Do not present assignment identifiers as if they were human-readable names.
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)) return "Changed";
  return text;
};

function entityHref(event: OrganizationAuditEvent) {
  if (!event.entityId) return null;
  if (event.entityType === "project") return `/projects/${event.entityId}`;
  if (event.entityType === "task") return `/tasks/${event.entityId}`;
  return null;
}

export default function WorkspaceActivity() {
  const { workspaceRole } = useAuth();
  const permitted = workspaceRole === "owner" || workspaceRole === "admin";
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [projectId, setProjectId] = useState("");
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OrganizationAuditEvent | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(rawSearch.trim()); setPage(1); }, 250); return () => window.clearTimeout(timer); }, [rawSearch]);
  const filters = useMemo(() => ({ search, category, action, entityType, projectId, actorId, from, to, page, limit: 30 }), [search, category, action, entityType, projectId, actorId, from, to, page]);
  const query = useQuery({ queryKey: ["workspace-activity", filters], queryFn: () => api.getOrganizationAuditEvents(filters), enabled: permitted, staleTime: 15000 });
  const events = query.data?.data.events || [];
  const pagination = query.data?.data.pagination;
  const actorOptions = useMemo(() => [...new Map(events.filter((event) => event.actor).map((event) => [event.actor!.id, event.actor!])).values()], [events]);
  const clearFilters = () => { setRawSearch(""); setSearch(""); setCategory(""); setAction(""); setEntityType(""); setProjectId(""); setActorId(""); setFrom(""); setTo(""); setPage(1); };

  if (!permitted) return <main className="mx-auto max-w-4xl p-6"><Card><CardContent className="flex items-start gap-3 p-6"><ShieldAlert className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><h1 className="font-semibold">Activity Log</h1><p className="mt-1 text-sm text-muted-foreground">Workspace owner or admin access is required to review organization activity.</p></div></CardContent></Card></main>;

  return <main className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col gap-5 overflow-y-auto p-4 md:p-7">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1><button type="button" aria-label="About Activity Log" title="Activity Log shows supported workspace actions recorded by Admiino from the date this feature was enabled. Earlier or unsupported activity may not appear." className="rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><CircleHelp className="h-4 w-4" /></button></div><p className="mt-1 text-sm text-muted-foreground">Review important actions and changes recorded across your workspace.</p></div>
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground"><ShieldAlert className="h-3.5 w-3.5" />Workspace owners and admins</span>
    </header>
    <div className="rounded-lg border border-primary/15 bg-primary/[0.035] px-4 py-3 text-sm text-muted-foreground">Activity Log records supported actions from the date this feature was enabled. Earlier or unsupported activity may not appear.</div>
    <section aria-label="Activity filters" className="grid gap-2 rounded-xl border bg-card p-3 md:grid-cols-2 xl:grid-cols-6">
      <label className="relative md:col-span-2"><span className="sr-only">Search activity</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={rawSearch} onChange={(event) => setRawSearch(event.target.value)} placeholder="Search actor, item, or action" className="pl-9" /></label>
      <label><span className="sr-only">Category</span><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label><span className="sr-only">Entity type</span><select value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">All items</option>{ENTITY_TYPES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label><span className="sr-only">Action</span><select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">All actions</option>{[...new Set(events.map((event) => event.action))].sort().map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label><span className="sr-only">Actor</span><select value={actorId} onChange={(event) => { setActorId(event.target.value); setPage(1); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">All actors</option>{actorOptions.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
      <label><span className="sr-only">Project ID filter</span><Input value={projectId} onChange={(event) => { setProjectId(event.target.value); setPage(1); }} placeholder="Project ID" /></label>
      <div className="flex gap-2 md:col-span-2 xl:col-span-2"><label className="min-w-0 flex-1"><span className="sr-only">From date</span><Input type="date" aria-label="From date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label><label className="min-w-0 flex-1"><span className="sr-only">To date</span><Input type="date" aria-label="To date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label><Button type="button" variant="outline" size="icon" aria-label="Clear filters" onClick={clearFilters}><FilterX className="h-4 w-4" /></Button></div>
    </section>
    <section aria-live="polite" className="min-h-0 flex-1">
      {query.isLoading ? <div className="space-y-3" aria-label="Loading activity">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl border bg-muted/40" />)}</div>
        : query.isError ? <Card><CardContent className="p-8 text-center"><p className="font-medium">Activity could not be loaded</p><p className="mt-1 text-sm text-muted-foreground">Try again in a moment.</p><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Try again</Button></CardContent></Card>
            : events.length === 0 ? <Card><CardContent className="flex flex-col items-center p-10 text-center"><Activity className="mb-3 h-8 w-8 text-muted-foreground/60" /><h2 className="font-medium">{search || category || action || entityType || projectId || actorId || from || to ? "No activity matches these filters" : "No recorded workspace activity yet"}</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">Earlier or unsupported actions may not appear in this forward-looking Activity Log.</p>{(search || category || action || entityType || projectId || actorId || from || to) && <Button className="mt-4" variant="outline" onClick={clearFilters}>Clear filters</Button>}</CardContent></Card>
            : <div className="space-y-3">{events.map((event) => <button key={event.id} type="button" onClick={() => setSelected(event)} className="group flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:gap-4">
              <Avatar className="mt-0.5 h-9 w-9 shrink-0"><AvatarImage src={event.actor?.avatar || undefined} alt="" /><AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{event.actor?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || (event.actorType === "user" ? "AD" : "SY")}</AvatarFallback></Avatar>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-semibold">{event.actor?.name || humanize(event.actorType)}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{humanize(event.category)}</span></span><span className="mt-1 block text-sm text-foreground">{event.summary}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{event.entityNameSnapshot || humanize(event.entityType)}{event.projectId && event.entityType !== "project" ? " · Project-linked work" : ""}</span></span>
              <span className="flex shrink-0 items-center gap-1.5 pt-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{dateLabel(event.occurredAt)}</span><span className="sm:hidden">{new Date(event.occurredAt).toLocaleDateString()}</span></span>
            </button>)}</div>}
    </section>
    {pagination && pagination.totalPages > 1 && <nav aria-label="Activity pages" className="flex items-center justify-between border-t pt-3"><p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages} · {pagination.total} events</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button variant="outline" size="sm" disabled={page >= pagination.totalPages || query.isFetching} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></nav>}
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Activity details</DialogTitle><DialogDescription>Recorded workspace action</DialogDescription></DialogHeader>{selected && <div className="space-y-5"><div className="flex items-center gap-3"><Avatar><AvatarImage src={selected.actor?.avatar || undefined} alt="" /><AvatarFallback>{selected.actor?.name.slice(0, 1) || "A"}</AvatarFallback></Avatar><div><p className="text-sm font-medium">{selected.actor?.name || humanize(selected.actorType)}</p><p className="text-xs text-muted-foreground">{dateLabel(selected.occurredAt)}</p></div></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</p><p className="mt-1 text-sm">{selected.summary}</p></div><div className="grid grid-cols-2 gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p><p className="mt-1 text-sm">{humanize(selected.category)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item</p><p className="mt-1 text-sm">{selected.entityNameSnapshot || humanize(selected.entityType)}</p></div></div>{selected.changes && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recorded changes</p><div className="mt-2 space-y-2">{Object.entries(selected.changes).map(([key, change]) => <div key={key} className="grid grid-cols-[90px_1fr_auto_1fr] items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs"><span className="font-medium">{humanize(key)}</span><span className="truncate text-muted-foreground">{changeLabel(change.from)}</span><span aria-hidden="true">→</span><span className="truncate">{changeLabel(change.to)}</span></div>)}</div></div>}{(() => { const href = entityHref(selected); return href ? <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" to={href} onClick={() => setSelected(null)}>Open current item<ExternalLink className="h-3.5 w-3.5" /></Link> : ["project", "task"].includes(selected.entityType) && selected.entityId ? <p className="text-sm text-muted-foreground">Item no longer available</p> : null; })()}</div>}</DialogContent></Dialog>
  </main>;
}
