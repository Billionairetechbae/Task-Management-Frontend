import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ArrowDownUp, BriefcaseBusiness, CalendarClock, CircleHelp, Clock3, ListChecks, Search, ShieldAlert, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api, type WorkloadEntry, type WorkloadLevel, type WorkloadPerson, type WorkloadTaskReference, type WorkloadTeam } from "@/lib/api";
import { defaultWorkloadFilters, filterAndSortPeople, filterAndSortTeams, type WorkloadFilters, type WorkloadSort } from "@/lib/workloadView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const levelStyle: Record<WorkloadLevel, string> = {
  light: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  balanced: "border-success/25 bg-success/10 text-success",
  heavy: "border-warning/30 bg-warning/10 text-warning",
  overloaded: "border-destructive/25 bg-destructive/10 text-destructive",
};
const levelLabel: Record<WorkloadLevel, string> = { light: "Light", balanced: "Balanced", heavy: "Heavy", overloaded: "Overloaded" };
const roleLabel: Record<string, string> = { owner: "Owner", admin: "Admin", manager: "Manager", member: "Member" };

function personName(person: WorkloadPerson["user"]) { return `${person.firstName} ${person.lastName}`.trim(); }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function dateText(value?: string | null) { return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No deadline"; }

function WorkloadBadge({ entry }: { entry: WorkloadEntry }) {
  return <Tooltip><TooltipTrigger asChild><span tabIndex={0} className={cn("inline-flex cursor-help items-center rounded-full border px-2.5 py-1 text-xs font-medium", levelStyle[entry.workload.level])}>{levelLabel[entry.workload.level]}</span></TooltipTrigger><TooltipContent className="max-w-xs"><p className="font-medium">Workload score: {entry.workload.score}</p>{entry.workload.reasons.length ? <ul className="mt-1 list-disc space-y-1 pl-4">{entry.workload.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p className="mt-1">No active assigned work.</p>}</TooltipContent></Tooltip>;
}

function Metrics({ entry }: { entry: WorkloadEntry }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-5">
    <Metric label="Active tasks" value={entry.metrics.activeTasks} />
    <Metric label="Overdue" value={entry.metrics.overdueTasks} danger={entry.metrics.overdueTasks > 0} />
    <Metric label="Due soon" value={entry.metrics.dueSoonTasks} warning={entry.metrics.dueSoonTasks > 0} />
    <Metric label="High priority" value={entry.metrics.highPriorityTasks} warning={entry.metrics.highPriorityTasks > 0} />
    <Metric label="Active projects" value={entry.metrics.activeProjects} />
  </div>;
}

function Metric({ label, value, danger, warning }: { label: string; value: number; danger?: boolean; warning?: boolean }) {
  return <div><span className="block text-muted-foreground">{label}</span><span className={cn("mt-0.5 inline-block font-semibold tabular-nums", danger && "text-destructive", warning && !danger && "text-warning")}>{value}</span></div>;
}

function SelectFilter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="grid min-w-32 gap-1 text-xs font-medium text-muted-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2.5 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{children}</select></label>;
}

function SummaryCard({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone?: "success" | "warning" | "danger" }) {
  return <Card className="p-3.5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{title}</p><span className={cn(tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "danger" && "text-destructive", !tone && "text-muted-foreground")}>{icon}</span></div><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></Card>;
}

function WorkloadDistribution({ values }: { values: Record<WorkloadLevel, number> }) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return <div aria-label="Workload distribution" className="flex h-2 overflow-hidden rounded-full bg-muted">
    {(["light", "balanced", "heavy", "overloaded"] as WorkloadLevel[]).map((level) => <div key={level} title={`${levelLabel[level]}: ${values[level]}`} className={cn(level === "light" && "bg-slate-400", level === "balanced" && "bg-emerald-500", level === "heavy" && "bg-amber-500", level === "overloaded" && "bg-rose-500")} style={{ width: total ? `${values[level] / total * 100}%` : "0%" }} />)}
  </div>;
}

export default function Workload() {
  const navigate = useNavigate();
  const { activeCompanyId } = useAuth();
  const [tab, setTab] = useState<"people" | "teams">("people");
  const [filters, setFilters] = useState<WorkloadFilters>(defaultWorkloadFilters);
  const [selected, setSelected] = useState<{ name: string; entry: WorkloadEntry } | null>(null);
  const query = useQuery({ queryKey: ["workload", activeCompanyId], queryFn: () => api.getWorkload(), enabled: Boolean(activeCompanyId), staleTime: 30_000 });
  const data = query.data?.data;
  const people = useMemo(() => data ? filterAndSortPeople(data.people, filters) : [], [data, filters]);
  const teams = useMemo(() => data ? filterAndSortTeams(data.teams, filters) : [], [data, filters]);
  const teamOptions = data?.teams || [];
  const roles = [...new Set((data?.people || []).map((person) => person.user.role))];
  const denied = query.isError && (query.error as Error & { statusCode?: number }).statusCode === 403;
  const set = <K extends keyof WorkloadFilters>(key: K, value: WorkloadFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const selectedTasks = selected?.entry.tasks || [];

  return <DashboardLayout><TooltipProvider delayDuration={250}>
    <main className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Workload</h1><Tooltip><TooltipTrigger asChild><button type="button" aria-label="About workload estimates" className="rounded-full p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CircleHelp className="h-4 w-4" /></button></TooltipTrigger><TooltipContent className="max-w-sm"><p>Workload estimates how work is distributed using active assignments, deadlines, priorities and active projects. It does not represent tracked hours or contractual capacity.</p><p className="mt-2">Score = active tasks + 2× overdue + due within 7 days + high/urgent priority + active projects after the first three. Bands: Light 0–3, Balanced 4–7, Heavy 8–11, Overloaded 12+.</p><a className="mt-2 inline-block font-medium text-primary underline" href="https://www.admiino.com/guide/teams" target="_blank" rel="noreferrer">Learn more about Teams</a></TooltipContent></Tooltip></div><p className="mt-1 text-sm text-muted-foreground">See how active work is distributed across people and Teams, and where assignments may need attention.</p></div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"><Activity className="h-4 w-4 text-primary" />{data?.scope === "teams" ? "Team Lead scope" : "Workspace scope"} · Assignment-based estimate</div>
      </header>

      {query.isPending ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border bg-muted/40" />)}</div> : denied ? <Card className="mx-auto max-w-xl p-8 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 text-lg font-semibold">Workload access is restricted</h2><p className="mt-1 text-sm text-muted-foreground">This view is available to workspace managers with workload access and Team Leads for their Teams.</p><Button className="mt-4" variant="outline" onClick={() => navigate("/workspace-insights")}>Open Workspace Insights</Button></Card> : query.isError ? <Card className="p-8 text-center"><h2 className="font-semibold">Couldn’t load workload</h2><p className="mt-1 text-sm text-muted-foreground">Check your workspace access and try again.</p><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Try again</Button></Card> : data && <>
        <section aria-label="Workload summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard title="Active Members" value={data.summary.activeMembers} icon={<Users className="h-4 w-4" />} />
          <SummaryCard title="Balanced" value={data.summary.balanced} icon={<Activity className="h-4 w-4" />} tone="success" />
          <SummaryCard title="Heavy" value={data.summary.heavy} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
          <SummaryCard title="Overloaded" value={data.summary.overloaded} icon={<AlertTriangle className="h-4 w-4" />} tone="danger" />
          <SummaryCard title="Unassigned" value={data.summary.unassignedTasks} icon={<ListChecks className="h-4 w-4" />} tone={data.summary.unassignedTasks ? "warning" : undefined} />
          <SummaryCard title="Overdue Tasks" value={data.summary.overdueTasks} icon={<Clock3 className="h-4 w-4" />} tone={data.summary.overdueTasks ? "danger" : undefined} />
        </section>
        <div className="flex items-center gap-3"><span className="shrink-0 text-xs font-medium text-muted-foreground">Distribution</span><WorkloadDistribution values={{ light: data.summary.light, balanced: data.summary.balanced, heavy: data.summary.heavy, overloaded: data.summary.overloaded }} /><div className="hidden shrink-0 gap-3 text-[11px] text-muted-foreground sm:flex">{(["light", "balanced", "heavy", "overloaded"] as WorkloadLevel[]).map((level) => <span key={level}>{levelLabel[level]} {data.summary[level]}</span>)}</div></div>

        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1 sm:w-fit" role="tablist" aria-label="Workload view">
              <button role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")} className={cn("rounded-md px-4 py-2 text-sm font-medium", tab === "people" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>People <span className="ml-1 text-xs text-muted-foreground">{data.people.length}</span></button>
              <button role="tab" aria-selected={tab === "teams"} onClick={() => setTab("teams")} className={cn("rounded-md px-4 py-2 text-sm font-medium", tab === "teams" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Teams <span className="ml-1 text-xs text-muted-foreground">{data.teams.length}</span></button>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <label className="relative block w-full xl:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={filters.search} onChange={(event) => set("search", event.target.value)} placeholder={tab === "people" ? "Search people or Teams" : "Search Teams or leads"} className="pl-9" aria-label="Search workload" /></label>
              <div className="flex flex-wrap items-end gap-2">
                <SelectFilter label="Workload" value={filters.level} onChange={(value) => set("level", value as WorkloadFilters["level"])}><option value="all">All levels</option><option value="light">Light</option><option value="balanced">Balanced</option><option value="heavy">Heavy</option><option value="overloaded">Overloaded</option></SelectFilter>
                {tab === "people" && <SelectFilter label="Team" value={filters.teamId} onChange={(value) => set("teamId", value)}><option value="all">All Teams</option>{teamOptions.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</SelectFilter>}
                {tab === "people" && <SelectFilter label="Role" value={filters.role} onChange={(value) => set("role", value)}><option value="all">All roles</option>{roles.map((role) => <option key={role} value={role}>{roleLabel[role] || role}</option>)}</SelectFilter>}
                <SelectFilter label="Sort by" value={filters.sort} onChange={(value) => set("sort", value as WorkloadSort)}><option value="attention">Workload severity</option><option value="overdue">Overdue tasks</option><option value="active">Active tasks</option><option value="due_soon">Due soon</option><option value="priority">High priority</option><option value="projects">Active projects</option><option value="name">Name</option></SelectFilter>
                {Object.entries(filters).some(([key, value]) => value !== defaultWorkloadFilters[key as keyof WorkloadFilters]) && <Button variant="ghost" size="sm" onClick={() => setFilters(defaultWorkloadFilters)}>Clear filters</Button>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={filters.overdueOnly} onChange={(event) => set("overdueOnly", event.target.checked)} className="h-4 w-4 accent-primary" />Overdue only</label><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={filters.dueSoonOnly} onChange={(event) => set("dueSoonOnly", event.target.checked)} className="h-4 w-4 accent-primary" />Due this week</label><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={filters.highPriorityOnly} onChange={(event) => set("highPriorityOnly", event.target.checked)} className="h-4 w-4 accent-primary" />High priority workload</label></div>
          </div>

          {tab === "people" ? people.length ? <>
            <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="sticky top-0 z-10 bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Person", "Role", "Teams", "Active", "Overdue", "Due soon", "High priority", "Projects", "Workload", ""].map((heading, index) => <th key={`${heading}-${index}`} className="whitespace-nowrap px-3 py-3 font-medium first:pl-5 last:pr-5">{heading}</th>)}</tr></thead><tbody className="divide-y">{people.map((person) => <tr key={person.user.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelected({ name: personName(person.user), entry: person })}><td className="px-3 py-3 pl-5"><div className="flex items-center gap-2.5"><Avatar className="h-8 w-8"><AvatarImage src={person.user.avatar || undefined} /><AvatarFallback>{initials(personName(person.user))}</AvatarFallback></Avatar><span className="font-medium">{personName(person.user)}</span></div></td><td className="px-3 py-3">{roleLabel[person.user.role] || person.user.role}</td><td className="max-w-44 px-3 py-3"><div className="flex flex-wrap gap-1">{person.teams.slice(0, 2).map((team) => <span key={team.id} className="rounded bg-muted px-2 py-0.5 text-xs">{team.name}</span>)}{person.teams.length > 2 && <span className="text-xs text-muted-foreground">+{person.teams.length - 2}</span>}{!person.teams.length && <span className="text-muted-foreground">—</span>}</div></td><td className="px-3 py-3 tabular-nums">{person.metrics.activeTasks}</td><td className={cn("px-3 py-3 tabular-nums", person.metrics.overdueTasks > 0 && "font-semibold text-destructive")}>{person.metrics.overdueTasks}</td><td className="px-3 py-3 tabular-nums">{person.metrics.dueSoonTasks}</td><td className="px-3 py-3 tabular-nums">{person.metrics.highPriorityTasks}</td><td className="px-3 py-3 tabular-nums">{person.metrics.activeProjects}</td><td className="px-3 py-3"><WorkloadBadge entry={person} /></td><td className="px-3 py-3 pr-5"><Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelected({ name: personName(person.user), entry: person }); }}>View work</Button></td></tr>)}</tbody></table></div>
            <div className="grid gap-3 p-3 lg:hidden">{people.map((person) => <Card key={person.user.id} className="p-4"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><Avatar className="h-9 w-9"><AvatarImage src={person.user.avatar || undefined} /><AvatarFallback>{initials(personName(person.user))}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold">{personName(person.user)}</p><p className="truncate text-xs text-muted-foreground">{roleLabel[person.user.role] || person.user.role} · {person.teams.map((team) => team.name).join(", ") || "No Team"}</p></div></div><WorkloadBadge entry={person} /></div><div className="mt-4 grid grid-cols-2 gap-y-3 text-xs sm:grid-cols-3"><Metric label="Active tasks" value={person.metrics.activeTasks} /><Metric label="Overdue" value={person.metrics.overdueTasks} danger={person.metrics.overdueTasks > 0} /><Metric label="Due soon" value={person.metrics.dueSoonTasks} /><Metric label="High priority" value={person.metrics.highPriorityTasks} /><Metric label="Projects" value={person.metrics.activeProjects} /></div><Button className="mt-4 w-full" variant="outline" size="sm" onClick={() => setSelected({ name: personName(person.user), entry: person })}>View assigned work</Button></Card>)}</div>
          </> : <EmptyState label={data.people.length ? "No people match these filters" : "No active workspace members"} onClear={() => setFilters(defaultWorkloadFilters)} /> : teams.length ? <>
            <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 z-10 bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Team", "Lead", "Members", "Active", "Overdue", "Due soon", "High priority", "Projects", "Workload", ""].map((heading, index) => <th key={`${heading}-${index}`} className="whitespace-nowrap px-3 py-3 font-medium first:pl-5 last:pr-5">{heading}</th>)}</tr></thead><tbody className="divide-y">{teams.map((team) => <tr key={team.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelected({ name: team.name, entry: team })}><td className="px-3 py-3 pl-5 font-medium">{team.name}</td><td className="px-3 py-3">{team.lead ? `${team.lead.firstName} ${team.lead.lastName}` : "No lead"}</td><td className="px-3 py-3 tabular-nums">{team.memberCount}</td><td className="px-3 py-3 tabular-nums">{team.metrics.activeTasks}</td><td className={cn("px-3 py-3 tabular-nums", team.metrics.overdueTasks > 0 && "font-semibold text-destructive")}>{team.metrics.overdueTasks}</td><td className="px-3 py-3 tabular-nums">{team.metrics.dueSoonTasks}</td><td className="px-3 py-3 tabular-nums">{team.metrics.highPriorityTasks}</td><td className="px-3 py-3 tabular-nums">{team.metrics.activeProjects}</td><td className="px-3 py-3"><WorkloadBadge entry={team} /></td><td className="px-3 py-3 pr-5"><Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); navigate(`/teams?team=${encodeURIComponent(team.id)}`); }}>Open Team</Button></td></tr>)}</tbody></table></div>
            <div className="grid gap-3 p-3 lg:hidden">{teams.map((team) => <Card key={team.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{team.name}</p><p className="mt-1 text-xs text-muted-foreground">Lead: {team.lead ? `${team.lead.firstName} ${team.lead.lastName}` : "No lead"} · {team.memberCount} members</p></div><WorkloadBadge entry={team} /></div><div className="mt-4 grid grid-cols-2 gap-y-3 text-xs"><Metric label="Active tasks" value={team.metrics.activeTasks} /><Metric label="Overdue" value={team.metrics.overdueTasks} danger={team.metrics.overdueTasks > 0} /><Metric label="Due soon" value={team.metrics.dueSoonTasks} /><Metric label="High priority" value={team.metrics.highPriorityTasks} /><Metric label="Projects" value={team.metrics.activeProjects} /></div><Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => navigate(`/teams?team=${encodeURIComponent(team.id)}`)}>Open Team</Button></Card>)}</div>
          </> : <EmptyState label={data.teams.length ? "No Teams match these filters" : "No Teams yet"} onClear={() => setFilters(defaultWorkloadFilters)} />}
          <footer className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{tab === "people" ? `Showing ${people.length} of ${data.people.length} people` : `Showing ${teams.length} of ${data.teams.length} Teams`}</span><span className="hidden items-center gap-1 sm:inline-flex"><ArrowDownUp className="h-3.5 w-3.5" />Sorted by {filters.sort.replaceAll("_", " ")}</span></footer>
        </Card>

        {data.unassigned.length > 0 && <Card className="overflow-hidden"><div className="flex items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold">Unassigned active work</h2><p className="mt-1 text-xs text-muted-foreground">Tasks without a person or Team assignment · {data.summary.unassignedOverdueTasks} overdue · {data.summary.unassignedDueSoonTasks} due within 7 days</p></div><span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">{data.unassigned.length}</span></div><div className="divide-y">{data.unassigned.slice(0, 8).map((task) => <button key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/30"><span className="min-w-0 truncate text-sm font-medium">{task.title}</span><span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground"><span>{task.priority || "—"}</span><span>{dateText(task.deadline)}</span><ListChecks className="h-4 w-4" /></span></button>)}</div></Card>}
      </>}
    </main>
    <WorkloadDetail selected={selected} onClose={() => setSelected(null)} onOpenTask={(task) => { setSelected(null); navigate(`/tasks/${task.id}`); }} onOpenTeam={(teamId) => { setSelected(null); navigate(`/teams?team=${encodeURIComponent(teamId)}`); }} tasks={selectedTasks} />
  </TooltipProvider></DashboardLayout>;
}

function EmptyState({ label, onClear }: { label: string; onClear: () => void }) { return <div className="px-6 py-14 text-center"><Search className="mx-auto h-8 w-8 text-muted-foreground/60" /><h2 className="mt-3 font-semibold">{label}</h2><Button className="mt-4" variant="outline" onClick={onClear}>Clear filters</Button></div>; }

function WorkloadDetail({ selected, onClose, onOpenTask, onOpenTeam, tasks }: { selected: { name: string; entry: WorkloadEntry } | null; onClose: () => void; onOpenTask: (task: WorkloadTaskReference) => void; onOpenTeam: (teamId: string) => void; tasks: WorkloadTaskReference[] }) {
  const person = selected?.entry as WorkloadPerson | undefined;
  const team = selected?.entry as WorkloadTeam | undefined;
  return <Dialog open={!!selected} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{selected?.name}</DialogTitle>
        <DialogDescription>Current active assigned work and workload signals. This view does not track hours or capacity.</DialogDescription>
      </DialogHeader>
      {selected && <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WorkloadBadge entry={selected.entry} />
          {person?.user && <span className="text-xs text-muted-foreground">{roleLabel[person.user.role] || person.user.role} · {person.teams.map((item) => item.name).join(", ") || "No Team"}</span>}
          {team?.id && <Button variant="outline" size="sm" onClick={() => onOpenTeam(team.id)}><Users className="mr-2 h-4 w-4" />Open Team</Button>}
        </div>
        <Metrics entry={selected.entry} />
        <div>
          <h3 className="mb-2 text-sm font-semibold">Active assigned tasks ({tasks.length})</h3>
          {tasks.length ? <div className="max-h-80 divide-y overflow-y-auto rounded-lg border">
            {tasks.map((task) => <button key={task.id} onClick={() => onOpenTask(task)} className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{task.title}</span>
                <span className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>{task.status.replaceAll("_", " ")}</span><span>{task.priority}</span>
                  {task.deadline && <span><CalendarClock className="mr-1 inline h-3 w-3" />{dateText(task.deadline)}</span>}
                  {task.projectId && <span><BriefcaseBusiness className="mr-1 inline h-3 w-3" />Project</span>}
                </span>
              </span>
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>)}
          </div> : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No active assigned tasks.</p>}
        </div>
      </div>}
    </DialogContent>
  </Dialog>;
}
