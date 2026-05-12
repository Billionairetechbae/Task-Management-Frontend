// src/pages/ProjectHealth.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, ProjectHealthProject, ProjectHealthSummary, ProjectHealthStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  FolderKanban,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

function statusClass(status: ProjectHealthStatus) {
  switch (status) {
    case "healthy":
      return "bg-success/10 text-success border-success/20";
    case "watchlist":
      return "bg-warning/10 text-warning border-warning/20";
    case "at_risk":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "critical":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function scoreBarClass(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 65) return "text-warning";
  if (score >= 45) return "text-orange-600";
  return "text-destructive";
}

function formatStatusLabel(status: string) {
  return status.split("_").join(" ");
}

function getAssigneeName(person: any) {
  if (!person) return "Unassigned";
  return `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unassigned";
}

export default function ProjectHealth() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<ProjectHealthSummary | null>(null);
  const [projects, setProjects] = useState<ProjectHealthProject[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectHealthStatus | "all">("all");

  const loadHealth = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);

      const res = await api.getProjectHealth();
      const data = (res as any)?.data || {};

      setSummary(data.summary || null);
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (error: any) {
      toast({
        title: "Failed to load project health",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHealth("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProjects = useMemo(() => {
    const search = query.trim().toLowerCase();

    return projects.filter((item) => {
      const matchesSearch =
        !search ||
        item.project.name?.toLowerCase().includes(search) ||
        item.project.description?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || item.healthStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading project health...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-3">
              <Activity className="w-3.5 h-3.5" />
              Project Health Intelligence
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Project Health
            </h1>

            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              See which projects are healthy, slipping, overloaded, overdue, or in need of immediate management attention.
            </p>
          </div>

          <Button
            variant="outline"
            className="gap-2 w-fit"
            onClick={() => loadHealth("refresh")}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Average Score</p>
                  <p className={cn("text-2xl font-bold", scoreBarClass(summary?.averageHealthScore || 0))}>
                    {summary?.averageHealthScore || 0}
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <HealthStatCard
            label="Healthy"
            value={summary?.counts?.healthy || 0}
            icon={<CheckCircle2 className="w-5 h-5" />}
            className="text-success"
          />

          <HealthStatCard
            label="Watchlist"
            value={summary?.counts?.watchlist || 0}
            icon={<Clock className="w-5 h-5" />}
            className="text-warning"
          />

          <HealthStatCard
            label="At Risk"
            value={summary?.counts?.at_risk || 0}
            icon={<AlertTriangle className="w-5 h-5" />}
            className="text-orange-600"
          />

          <HealthStatCard
            label="Critical"
            value={summary?.counts?.critical || 0}
            icon={<ShieldAlert className="w-5 h-5" />}
            className="text-destructive"
          />
        </div>

        {summary?.criticalProjects?.length ? (
          <Card className="border-destructive/20 bg-destructive/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                Projects needing attention
              </CardTitle>
              <CardDescription>
                These projects have the strongest delivery risk signals.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.criticalProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="text-left rounded-xl border border-border bg-background p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-semibold text-sm truncate">{project.name}</p>
                    <Badge variant="outline" className={cn("shrink-0", statusClass(project.healthStatus))}>
                      {project.healthLabel}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project.topRisk}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects..."
                  className="pl-9"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <TabsList className="grid grid-cols-5 w-full lg:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="healthy">Healthy</TabsTrigger>
                  <TabsTrigger value="watchlist">Watch</TabsTrigger>
                  <TabsTrigger value="at_risk">Risk</TabsTrigger>
                  <TabsTrigger value="critical">Critical</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="w-7 h-7 text-muted-foreground" />
              </div>
              <h2 className="font-semibold mb-1">No projects found</h2>
              <p className="text-sm text-muted-foreground">
                No project matches the current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredProjects.map((item) => (
              <ProjectHealthCard
                key={item.project.id}
                item={item}
                onOpen={() => navigate(`/projects/${item.project.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function HealthStatCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold", className)}>{value}</p>
          </div>
          <div className={cn("text-muted-foreground", className)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectHealthCard({
  item,
  onOpen,
}: {
  item: ProjectHealthProject;
  onOpen: () => void;
}) {
  const m = item.metrics;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{item.project.name}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {item.project.description || "No project description provided."}
            </CardDescription>
          </div>

          <Badge variant="outline" className={cn("shrink-0", statusClass(item.healthStatus))}>
            {item.healthLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className={cn("text-3xl font-bold leading-none", scoreBarClass(item.healthScore))}>
              {item.healthScore}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Health score</p>
          </div>

          <div className="flex-1">
            <Progress value={item.healthScore} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {item.healthDescription}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniMetric label="Completion" value={`${m.completionRate}%`} />
          <MiniMetric label="Open" value={m.openTasks} />
          <MiniMetric label="Overdue" value={m.overdueTasks} danger={m.overdueTasks > 0} />
          <MiniMetric label="Urgent" value={m.urgentOpenTasks} danger={m.urgentOpenTasks > 0} />
          <MiniMetric label="Stale" value={m.staleOpenTasks} danger={m.staleOpenTasks > 0} />
          <MiniMetric label="No owner" value={m.ownerlessOpenTasks} danger={m.ownerlessOpenTasks > 0} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold">Workload concentration</p>
          </div>

          <p className="text-xs text-muted-foreground">
            {item.workload.topAssignee
              ? `${getAssigneeName(item.workload.topAssignee)} carries ${item.workload.concentrationPercentage}% of open tasks.`
              : "No open workload concentration detected."}
          </p>
        </div>

        {item.riskReasons.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">Key risk signals</p>
            <div className="space-y-1.5">
              {item.riskReasons.slice(0, 3).map((risk, index) => (
                <div key={`${risk}-${index}`} className="flex gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold mb-2">Recommended action</p>
          <p className="text-xs text-muted-foreground">
            {item.recommendedActions[0] || "Keep monitoring this project."}
          </p>
        </div>

        {item.priorityTasks.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">Priority tasks</p>
            <div className="space-y-1">
              {item.priorityTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatStatusLabel(task.status)}
                      {task.assignee ? ` • ${getAssigneeName(task.assignee)}` : " • Unassigned"}
                    </p>
                  </div>

                  {task.isOverdue && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      Overdue
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full gap-2" onClick={onOpen}>
          Open Project
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className={cn("text-base font-bold", danger && "text-destructive")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}