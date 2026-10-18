import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ArrowDownUp, CalendarClock, CheckCircle2, CircleHelp, Clock3, ExternalLink, FolderKanban, Search, ShieldAlert, Users } from "lucide-react";
import { format, formatDistanceToNowStrict, isValid } from "date-fns";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useWorkspaceGovernance } from "@/hooks/useWorkspaceGovernance";
import { api, type ProjectHealthProject, type ProjectHealthStatus } from "@/lib/api";
import { defaultPortfolioFilters, filterAndSortPortfolioProjects, portfolioDeadline, portfolioIsCompleted, portfolioIsOverdue, portfolioNeedsAttention, portfolioProgress, type PortfolioDeadlineFilter, type PortfolioFilters, type PortfolioProgressFilter, type PortfolioSort } from "@/lib/projectPortfolio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const healthStyles: Record<ProjectHealthStatus, string> = {
  healthy: "border-success/25 bg-success/10 text-success",
  watchlist: "border-warning/25 bg-warning/10 text-warning",
  at_risk: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  critical: "border-destructive/25 bg-destructive/10 text-destructive",
};

function label(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "—";
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : "—";
}

function fullName(person?: { firstName?: string; lastName?: string } | null) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "No owner";
}

function HealthChip({ row }: { row: ProjectHealthProject }) {
  const status = row.healthStatus;
  const reasons = row.attentionReasons?.length ? row.attentionReasons : row.riskReasons?.length ? row.riskReasons : [row.healthDescription || "Based on the existing Project Health rules."];
  return <Tooltip>
    <TooltipTrigger asChild>
      <span tabIndex={0} className={cn("inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium", healthStyles[status])}>
        {status === "healthy" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{row.healthLabel || label(status)}
      </span>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs"><p className="font-medium">{row.healthDescription}</p><ul className="mt-1 list-disc space-y-1 pl-4">{reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul></TooltipContent>
  </Tooltip>;
}

function ProgressCell({ row }: { row: ProjectHealthProject }) {
  const progress = portfolioProgress(row);
  return <div className="min-w-28">
    <div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="font-medium tabular-nums">{progress}%</span><span className="text-muted-foreground">{row.metrics.completedTasks}/{row.metrics.totalTasks}</span></div>
    <Progress value={progress} className="h-1.5" aria-label={`${progress}% complete`} />
  </div>;
}

function SelectFilter({ label: fieldLabel, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="grid min-w-32 gap-1 text-xs font-medium text-muted-foreground">
    {fieldLabel}
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2.5 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{children}</select>
  </label>;
}

export default function ProjectPortfolio() {
  const navigate = useNavigate();
  const { activeCompanyId, workspaceRole } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const governance = useWorkspaceGovernance();
  const [filters, setFilters] = useState<PortfolioFilters>(defaultPortfolioFilters);
  const externalRole = ["guest", "external_viewer"].includes(workspaceRole || "");
  const query = useQuery({
    queryKey: ["project-health", "portfolio", activeCompanyId],
    queryFn: () => api.getProjectHealth(),
    enabled: Boolean(activeCompanyId) && !externalRole,
    staleTime: 30_000,
  });
  const projects = query.data?.data?.projects || [];
  const visibleProjects = useMemo(() => filterAndSortPortfolioProjects(projects, filters), [projects, filters]);
  const owners = useMemo(() => [...new Map(projects.filter((row) => row.project.owner).map((row) => [row.project.owner!.id, row.project.owner!])).values()].sort((a, b) => fullName(a).localeCompare(fullName(b))), [projects]);
  const teams = useMemo(() => [...new Map(projects.filter((row) => row.project.team).map((row) => [row.project.team!.id, row.project.team!])).values()].sort((a, b) => a.name.localeCompare(b.name)), [projects]);
  const summary = query.data?.data?.summary;
  const completed = summary?.completedProjects ?? projects.filter(portfolioIsCompleted).length;
  const overdue = summary?.overdueProjects ?? projects.filter((row) => portfolioIsOverdue(row)).length;
  const attention = summary?.needsAttentionProjects ?? projects.filter((row) => portfolioNeedsAttention(row)).length;
  const canCreate = canPerformRoleOperation("create_projects", workspaceRole) && !governance.capabilities?.projectCreationRestricted;

  const set = <K extends keyof PortfolioFilters>(key: K, value: PortfolioFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const openProject = (row: ProjectHealthProject) => navigate(`/projects/${row.project.id}?workspace=${encodeURIComponent(activeCompanyId || "")}`);
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => value !== defaultPortfolioFilters[key as keyof PortfolioFilters]);

  if (externalRole) return <DashboardLayout><Card className="mx-auto mt-10 max-w-xl p-8 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" /><h1 className="mt-3 text-xl font-semibold">Portfolio unavailable</h1><p className="mt-2 text-sm text-muted-foreground">Project Portfolio is available to workspace members with access to Projects.</p></Card></DashboardLayout>;

  return <DashboardLayout>
    <TooltipProvider delayDuration={250}>
      <div className="space-y-5 pb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Project Portfolio</h1>
              <Tooltip>
                <TooltipTrigger asChild><button type="button" aria-label="About Project Portfolio" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CircleHelp className="h-4 w-4" /></button></TooltipTrigger>
                <TooltipContent className="max-w-sm"><p>Project Portfolio gives managers a workspace-wide view of project health, progress, deadlines, ownership and workload signals so they can quickly spot work that needs attention.</p><a className="mt-2 inline-block font-medium text-primary underline" href="https://www.admiino.com/guide/projects" target="_blank" rel="noreferrer">Learn more about Projects</a></TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">A workspace-level view of delivery status, workload signals and projects that may need a closer look.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/project-health")}><Activity className="h-4 w-4" />Project Health</Button>
            {canCreate && <Button className="gap-2" onClick={() => navigate("/projects?create=true")}><FolderKanban className="h-4 w-4" />Create Project</Button>}
          </div>
        </header>

        {query.isPending ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border bg-muted/40" />)}</div> : query.isError ? <Card className="p-8 text-center"><p className="font-medium">Couldn’t load the project portfolio.</p><p className="mt-1 text-sm text-muted-foreground">Check your workspace access and try again.</p><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Try again</Button></Card> : <>
          <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-7">
            <SummaryCard label="Total Projects" value={summary?.totalProjects ?? projects.length} icon={<FolderKanban className="h-4 w-4" />} />
            <SummaryCard label="Active" value={summary?.activeProjects ?? projects.filter((row) => row.project.status === "active").length} icon={<Activity className="h-4 w-4" />} />
            <SummaryCard label="Completed" value={completed} icon={<CheckCircle2 className="h-4 w-4" />} />
            <SummaryCard label="Healthy" value={summary?.counts?.healthy ?? projects.filter((row) => row.healthStatus === "healthy").length} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
            <SummaryCard label="At Risk / Critical" value={(summary?.counts?.at_risk ?? 0) + (summary?.counts?.critical ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} tone="danger" />
            <SummaryCard label="Overdue" value={overdue} icon={<Clock3 className="h-4 w-4" />} tone="danger" />
            <SummaryCard label="Needs Attention" value={attention} icon={<CalendarClock className="h-4 w-4" />} tone="warning" />
          </section>

          <Card className="overflow-hidden">
            <div className="border-b p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <label className="relative block w-full xl:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={filters.search} onChange={(event) => set("search", event.target.value)} placeholder="Search projects, owners or teams" className="pl-9" aria-label="Search projects" />
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <SelectFilter label="Status" value={filters.status} onChange={(value) => set("status", value)}><option value="all">All statuses</option><option value="active">Active</option><option value="archived">Archived</option></SelectFilter>
                  <SelectFilter label="Health" value={filters.health} onChange={(value) => set("health", value as PortfolioFilters["health"])}><option value="all">All health</option><option value="healthy">Healthy</option><option value="watchlist">Watchlist</option><option value="at_risk">At Risk</option><option value="critical">Critical</option></SelectFilter>
                  <SelectFilter label="Owner" value={filters.ownerId} onChange={(value) => set("ownerId", value)}><option value="all">All owners</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{fullName(owner)}</option>)}</SelectFilter>
                  <SelectFilter label="Team" value={filters.teamId} onChange={(value) => set("teamId", value)}><option value="all">All teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</SelectFilter>
                  <SelectFilter label="Deadline" value={filters.deadline} onChange={(value) => set("deadline", value as PortfolioDeadlineFilter)}><option value="all">Any deadline</option><option value="overdue">Overdue</option><option value="next_7_days">Next 7 days</option><option value="no_deadline">No deadline</option></SelectFilter>
                  <SelectFilter label="Progress" value={filters.progress} onChange={(value) => set("progress", value as PortfolioProgressFilter)}><option value="all">Any progress</option><option value="0_24">0–24%</option><option value="25_49">25–49%</option><option value="50_74">50–74%</option><option value="75_99">75–99%</option><option value="100">100%</option></SelectFilter>
                  <SelectFilter label="Sort by" value={filters.sort} onChange={(value) => set("sort", value as PortfolioSort)}><option value="attention">Needs attention</option><option value="deadline">Deadline</option><option value="health">Health</option><option value="progress">Progress</option><option value="overdue_tasks">Overdue tasks</option><option value="name">Project name</option><option value="recent">Recently active</option></SelectFilter>
                  {hasActiveFilters && <Button variant="ghost" size="sm" onClick={() => setFilters(defaultPortfolioFilters)}>Clear filters</Button>}
                </div>
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={filters.needsAttention} onChange={(event) => set("needsAttention", event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />Needs attention only <span className="text-xs text-muted-foreground">(risk, overdue work, or deadline within 7 days)</span></label>
            </div>

            {projects.length === 0 ? <div className="px-6 py-16 text-center"><FolderKanban className="mx-auto h-9 w-9 text-muted-foreground/60" /><h2 className="mt-3 text-lg font-semibold">No projects yet</h2><p className="mt-1 text-sm text-muted-foreground">Create a project to start tracking delivery here.</p>{canCreate && <Button className="mt-4" onClick={() => navigate("/projects?create=true")}>Create Project</Button>}</div> : visibleProjects.length === 0 ? <div className="px-6 py-14 text-center"><Search className="mx-auto h-8 w-8 text-muted-foreground/60" /><h2 className="mt-3 font-semibold">No projects match these filters</h2><p className="mt-1 text-sm text-muted-foreground">Try changing the search or clearing one or more filters.</p><Button variant="outline" className="mt-4" onClick={() => setFilters(defaultPortfolioFilters)}>Clear filters</Button></div> : <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Project", "Owner", "Team", "Status", "Health", "Progress", "Open", "Overdue", "Deadline", "Last activity", ""].map((heading, index) => <th key={`${heading}-${index}`} className="whitespace-nowrap px-3 py-3 font-medium first:pl-5 last:pr-5">{heading}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {visibleProjects.map((row) => <tr key={row.project.id} className="transition-colors hover:bg-muted/30">
                      <td className="max-w-64 px-3 py-3 pl-5"><button onClick={() => openProject(row)} className="block max-w-full truncate text-left font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{row.project.name}</button>{row.project.description && <p className="mt-0.5 max-w-60 truncate text-xs text-muted-foreground">{row.project.description}</p>}</td>
                      <td className="whitespace-nowrap px-3 py-3">{fullName(row.project.owner)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{row.project.team?.name || "No team"}</td>
                      <td className="whitespace-nowrap px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{label(row.project.status)}</span></td>
                      <td className="whitespace-nowrap px-3 py-3"><HealthChip row={row} /></td>
                      <td className="px-3 py-3"><ProgressCell row={row} /></td>
                      <td className="px-3 py-3 tabular-nums">{row.metrics.openTasks}</td>
                      <td className="px-3 py-3 tabular-nums"><span className={row.metrics.overdueTasks ? "font-semibold text-destructive" : "text-muted-foreground"}>{row.metrics.overdueTasks}</span></td>
                      <td className="whitespace-nowrap px-3 py-3"><DeadlineLabel row={row} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{row.lastActivity && isValid(new Date(row.lastActivity)) ? formatDistanceToNowStrict(new Date(row.lastActivity), { addSuffix: true }) : "—"}</td>
                      <td className="px-3 py-3 pr-5"><Button variant="ghost" size="sm" onClick={() => openProject(row)} aria-label={`Open ${row.project.name}`}><ExternalLink className="h-4 w-4" /></Button></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-3 lg:hidden">
                {visibleProjects.map((row) => <PortfolioProjectCard key={row.project.id} row={row} onOpen={() => openProject(row)} />)}
              </div>
              <footer className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>Showing {visibleProjects.length} of {projects.length} authorized projects</span><span className="hidden items-center gap-1 sm:inline-flex"><ArrowDownUp className="h-3.5 w-3.5" />Sorted by {filters.sort === "attention" ? "needs attention" : filters.sort.replaceAll("_", " ")}</span></footer>
            </>}
          </Card>
        </>}
      </div>
    </TooltipProvider>
  </DashboardLayout>;
}

function SummaryCard({ label: title, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: "success" | "warning" | "danger" }) {
  return <Card className="p-3.5">
    <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{title}</p><span className={cn(tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "danger" && "text-destructive", !tone && "text-muted-foreground")}>{icon}</span></div>
    <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
  </Card>;
}

function DeadlineLabel({ row }: { row: ProjectHealthProject }) {
  const deadline = portfolioDeadline(row);
  if (!deadline) return <span className="text-muted-foreground">—</span>;
  const overdue = portfolioIsOverdue(row);
  return <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}><Clock3 className="h-3.5 w-3.5" />{dateLabel(deadline)}{overdue && <span className="text-[10px] uppercase">Overdue</span>}</span>;
}

function PortfolioProjectCard({ row, onOpen }: { row: ProjectHealthProject; onOpen: () => void }) {
  return <Card className="p-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><button onClick={onOpen} className="truncate text-left font-semibold hover:text-primary">{row.project.name}</button><p className="mt-1 truncate text-xs text-muted-foreground">{row.project.team?.name || "No team"} · {fullName(row.project.owner)}</p></div><HealthChip row={row} /></div>
    {row.project.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{row.project.description}</p>}
    <div className="mt-4"><ProgressCell row={row} /></div>
    <div className="mt-4 grid grid-cols-2 gap-y-3 text-xs"><div><span className="block text-muted-foreground">Status</span><span className="mt-0.5 inline-block rounded-full bg-muted px-2 py-0.5">{label(row.project.status)}</span></div><div><span className="block text-muted-foreground">Deadline</span><span className="mt-0.5 block"><DeadlineLabel row={row} /></span></div><div><span className="block text-muted-foreground">Overdue tasks</span><span className={cn("mt-0.5 block font-medium", row.metrics.overdueTasks > 0 && "text-destructive")}>{row.metrics.overdueTasks}</span></div><div><span className="block text-muted-foreground">Open tasks</span><span className="mt-0.5 block font-medium">{row.metrics.openTasks}</span></div></div>
    <Button variant="outline" size="sm" className="mt-4 w-full" onClick={onOpen}><Users className="mr-2 h-4 w-4" />Open Project</Button>
  </Card>;
}
