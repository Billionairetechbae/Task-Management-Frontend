import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, FolderKanban, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ContentCard, EmptyState, LoadingState, PageHeader, StatsCard } from "@/components/dashboard/DashboardComponents";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, Project, Team, WorkspaceDeliveryInsights, WorkspaceInsights as WorkspaceInsightsData, WorkspaceInsightsHistory } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  ["all", "All statuses"],
  ["pending", "Pending"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["delayed", "Delayed"],
  ["cancelled", "Cancelled"],
] as const;

const PRIORITY_OPTIONS = [
  ["all", "All priorities"],
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["urgent", "Urgent"],
] as const;

function formatDateInput(date: Date) { return date.toISOString().slice(0, 10); }

export default function WorkspaceInsights() {
  const { activeCompanyId } = useAuth();
  const { toast } = useToast();
  const [teamId, setTeamId] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [from, setFrom] = useState(() => formatDateInput(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => formatDateInput(new Date()));

  const teamsQuery = useQuery({
    queryKey: ["workspace-insight-teams", activeCompanyId],
    queryFn: () => api.listTeams(),
    enabled: Boolean(activeCompanyId),
  });
  const projectsQuery = useQuery({
    queryKey: ["workspace-insight-projects", activeCompanyId],
    queryFn: () => api.getProjects(),
    enabled: Boolean(activeCompanyId),
  });

  useEffect(() => {
    setTeamId("all");
    setProjectId("all");
    setStatus("all");
    setPriority("all");
    setFrom(formatDateInput(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
    setTo(formatDateInput(new Date()));
  }, [activeCompanyId]);

  const filters = {
    teamId: teamId === "all" ? undefined : teamId,
    projectId: projectId === "all" ? undefined : projectId,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
  };
  const insightsQuery = useQuery({
    queryKey: queryKeys.workspaceInsights(activeCompanyId, filters),
    queryFn: () => api.getWorkspaceInsights(filters),
    enabled: Boolean(activeCompanyId),
  });
  const historyFilters = { ...filters, from, to };
  const historyQuery = useQuery({
    queryKey: queryKeys.workspaceInsightsHistory(activeCompanyId, historyFilters),
    queryFn: () => api.getWorkspaceInsightsHistory(historyFilters),
    enabled: Boolean(activeCompanyId),
  });
  const deliveryQuery = useQuery({
    queryKey: ["workspace-insight-delivery", activeCompanyId, historyFilters],
    queryFn: () => api.getWorkspaceDeliveryInsights(historyFilters),
    enabled: Boolean(activeCompanyId),
  });

  useEffect(() => {
    if (insightsQuery.isError) toast({ title: "Unable to load workspace insights", description: (insightsQuery.error as Error).message, variant: "destructive" });
  }, [insightsQuery.isError, insightsQuery.error, toast]);

  const data = insightsQuery.data?.data as WorkspaceInsightsData | undefined;
  const history = historyQuery.data?.data as WorkspaceInsightsHistory | undefined;
  const delivery = deliveryQuery.data?.data as WorkspaceDeliveryInsights | undefined;
  const teams = (teamsQuery.data?.data?.teams || []) as Team[];
  const projectPayload = projectsQuery.data?.data as { projects?: Project[] } | undefined;
  const projects = projectPayload?.projects || [];

  if (!activeCompanyId) {
    return <DashboardLayout><EmptyState icon={Users} title="Choose a workspace" description="Select an active workspace to view operational insights." /></DashboardLayout>;
  }
  if (insightsQuery.isLoading) {
    return <DashboardLayout><LoadingState message="Loading workspace insights..." /></DashboardLayout>;
  }
  if (insightsQuery.isError) {
    const error = insightsQuery.error as any;
    return <DashboardLayout><EmptyState icon={AlertTriangle} title={error?.statusCode === 403 ? "Insights unavailable" : "Unable to load insights"} description={error?.statusCode === 403 ? "You do not have permission to view these workspace insights." : error?.message || "Try again shortly."} /></DashboardLayout>;
  }
  if (!data) {
    return <DashboardLayout><EmptyState icon={ClipboardList} title="No insights yet" description="There is no current workspace activity to summarize." /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Workspace Insights" description="Current project, task, team, and workload signals for this workspace." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={teamId} onValueChange={setTeamId}><SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger><SelectContent><SelectItem value="all">All Teams</SelectItem><SelectItem value="none">No Team</SelectItem>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent></Select>
          <Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger><SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITY_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Projects" value={data.summary.totalProjects} icon={FolderKanban} description={`${data.summary.projectsWithTeam} with a Team`} />
          <StatsCard title="Tasks" value={data.summary.totalTasks} icon={ClipboardList} description={`${data.summary.openTasks} open`} />
          <StatsCard title="Completed" value={data.summary.completedTasks} icon={CheckCircle2} description={`${data.summary.overdueTasks} overdue`} />
          <StatsCard title="Unassigned" value={data.summary.unassignedTasks} icon={AlertTriangle} description={`${data.summary.tasksWithoutTeam} without a Team`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <ContentCard noPadding>
            <div className="border-b border-border p-4"><h2 className="font-semibold">Teams</h2><p className="text-xs text-muted-foreground">Current workload for visible Teams.</p></div>
            {data.teams.length === 0 ? <EmptyState icon={Users} title="No Teams in this view" description="Team summaries appear when Teams are visible in the active workspace." /> : <div className="divide-y divide-border">{data.teams.map((team) => <div key={team.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{team.name}</p><p className="text-xs text-muted-foreground">{team.memberCount} members · {team.projectCount} projects</p></div><div className="text-right text-xs"><p>{team.openTasks} open tasks</p><p className="text-muted-foreground">{team.overdueTasks} overdue</p></div></div>)}</div>}
          </ContentCard>
          <ContentCard noPadding>
            <div className="border-b border-border p-4"><h2 className="font-semibold">Projects</h2><p className="text-xs text-muted-foreground">Task completion and current risk indicators.</p></div>
            {data.projects.length === 0 ? <EmptyState icon={FolderKanban} title="No Projects in this view" description="Try clearing a filter or create a project in this workspace." /> : <div className="divide-y divide-border">{data.projects.map((project) => <div key={project.id} className="p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{project.name}</p><span className="text-xs text-muted-foreground">{project.completionRate}% complete</span></div><p className="mt-1 text-xs text-muted-foreground">{project.team?.name || "No Team"} · {project.taskCount} tasks · {project.overdueTasks} overdue</p>{project.riskIndicators.length > 0 && <p className="mt-2 text-xs text-destructive">{project.riskIndicators.join(" · ")}</p>}</div>)}</div>}
          </ContentCard>
        </div>

        <ContentCard>
          <div className="border-b border-border pb-4"><h2 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4" />Delivery analytics</h2><p className="text-xs text-muted-foreground">Lifecycle-derived delivery metrics in UTC. These are separate from activity history.</p></div>
          {deliveryQuery.isLoading ? <LoadingState message="Loading delivery analytics..." /> : deliveryQuery.isError ? <p className="py-6 text-sm text-destructive">Unable to load delivery analytics.</p> : delivery ? <div className="space-y-5 pt-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-muted-foreground">Completed tasks</p><p className="text-xl font-semibold">{delivery.summary.completedTasks}</p></div><div><p className="text-xs text-muted-foreground">Throughput</p><p className="text-xl font-semibold">{delivery.summary.throughputCount}</p></div><div><p className="text-xs text-muted-foreground">Reopened</p><p className="text-xl font-semibold">{delivery.summary.reopenedTasks}</p></div><div><p className="text-xs text-muted-foreground">Average cycle</p><p className="text-xl font-semibold">{delivery.summary.averageCycleTimeDays === null ? "-" : `${delivery.summary.averageCycleTimeDays}d`}</p></div><div><p className="text-xs text-muted-foreground">Overdue completed</p><p className="text-xl font-semibold">{delivery.summary.overdueCompletedCount}</p></div></div><div className="space-y-2">{delivery.trends.slice(-14).map((day) => { const max = Math.max(...delivery.trends.map((item) => item.throughput), 1); return <div key={day.date} className="flex items-center gap-3 text-xs"><span className="w-24 shrink-0 text-muted-foreground">{day.date}</span><div className="h-3 flex-1 rounded bg-muted"><div className="h-3 rounded bg-primary" style={{ width: `${Math.round((day.throughput / max) * 100)}%` }} /></div><span className="w-8 text-right font-medium">{day.throughput}</span></div>; })}</div><div className="grid gap-4 md:grid-cols-3"><div><h3 className="mb-2 text-sm font-semibold">By Team</h3>{delivery.byTeam.length ? delivery.byTeam.slice(0, 5).map((item) => <p key={item.id || "none"} className="flex justify-between text-xs text-muted-foreground"><span>{item.name}</span><span>{item.throughputCount}</span></p>) : <p className="text-xs text-muted-foreground">No lifecycle data.</p>}</div><div><h3 className="mb-2 text-sm font-semibold">By Project</h3>{delivery.byProject.length ? delivery.byProject.slice(0, 5).map((item) => <p key={item.id || "none"} className="flex justify-between text-xs text-muted-foreground"><span>{item.name}</span><span>{item.throughputCount}</span></p>) : <p className="text-xs text-muted-foreground">No lifecycle data.</p>}</div><div><h3 className="mb-2 text-sm font-semibold">By Member</h3>{delivery.byMember.length ? delivery.byMember.slice(0, 5).map((item) => <p key={item.id || "none"} className="flex justify-between text-xs text-muted-foreground"><span>{item.name}</span><span>{item.throughputCount}</span></p>) : <p className="text-xs text-muted-foreground">No lifecycle data.</p>}</div></div></div> : <p className="pt-4 text-sm text-muted-foreground">No lifecycle data in this period.</p>}
        </ContentCard>

        <ContentCard>
          <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
            <div><h2 className="font-semibold">Activity history</h2><p className="text-xs text-muted-foreground">Activity-derived movement in UTC. Status activity is not an authoritative completion date.</p></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm" /></label><label className="text-xs text-muted-foreground">To<input type="date" value={to} max={formatDateInput(new Date())} onChange={(event) => setTo(event.target.value)} className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm" /></label></div>
          </div>
          {historyQuery.isLoading ? <LoadingState message="Loading activity history..." /> : historyQuery.isError ? <p className="py-8 text-sm text-destructive">Unable to load activity history.</p> : history ? <div className="space-y-5 pt-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-muted-foreground">Activity</p><p className="text-xl font-semibold">{history.summary.totalActivity}</p></div><div><p className="text-xs text-muted-foreground">Created</p><p className="text-xl font-semibold">{history.summary.taskCreated}</p></div><div><p className="text-xs text-muted-foreground">Status changes</p><p className="text-xl font-semibold">{history.summary.statusChanges}</p></div><div><p className="text-xs text-muted-foreground">Completed status changes</p><p className="text-xl font-semibold">{history.summary.completedStatusChanges}</p></div><div><p className="text-xs text-muted-foreground">Assignments</p><p className="text-xl font-semibold">{history.summary.assignmentActivity}</p></div></div><div className="space-y-2">{history.trends.length === 0 || history.trends.every((day) => day.totalActivity === 0) ? <p className="py-6 text-sm text-muted-foreground">No activity in this period.</p> : history.trends.slice(-14).map((day) => { const max = Math.max(...history.trends.map((item) => item.totalActivity), 1); return <div key={day.date} className="flex items-center gap-3 text-xs"><span className="w-24 shrink-0 text-muted-foreground">{day.date}</span><div className="h-3 flex-1 rounded bg-muted"><div className="h-3 rounded bg-primary" style={{ width: `${Math.round((day.totalActivity / max) * 100)}%` }} /></div><span className="w-8 text-right font-medium">{day.totalActivity}</span></div>; })}</div><div className="grid gap-4 md:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">By Team</h3>{history.byTeam.length ? history.byTeam.map((item) => <p key={item.id || "none"} className="flex justify-between text-xs text-muted-foreground"><span>{item.name}</span><span>{item.totalActivity}</span></p>) : <p className="text-xs text-muted-foreground">No Team activity.</p>}</div><div><h3 className="mb-2 text-sm font-semibold">By Project</h3>{history.byProject.length ? history.byProject.map((item) => <p key={item.id || "none"} className="flex justify-between text-xs text-muted-foreground"><span>{item.name}</span><span>{item.totalActivity}</span></p>) : <p className="text-xs text-muted-foreground">No project activity.</p>}</div></div></div> : null}
        </ContentCard>
      </div>
    </DashboardLayout>
  );
}
