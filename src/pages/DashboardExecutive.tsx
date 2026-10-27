import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Clock,
  CheckCircle2,
  Mail,
  User,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutList,
  Search,
  SlidersHorizontal,
  FolderKanban,
  CalendarDays,
  ArrowUpDown,
  UserRound,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  StatsCard,
  PageHeader,
  SectionHeader,
  ContentCard,
  EmptyState,
  LoadingState,
} from "@/components/dashboard/DashboardComponents";
import {
  TaskTable,
} from "@/components/dashboard/TaskComponents";
import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";
import Board from "@/pages/Board";

import { useAuth } from "@/contexts/AuthContext";
import { api, Task, TeamMember } from "@/lib/api";
import { filterTopLevelTasks } from "@/lib/taskListUtils";
import { useToast } from "@/hooks/use-toast";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import InviteUserDialog from "@/components/InviteUserDialog";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { cn } from "@/lib/utils";
import { JoinRequestsPreview } from "@/components/workspaces/JoinRequestsPreview";
import {
  useDashboardData,
  usePendingVerificationsQuery,
  useTaskCacheUpdater,
  type DashboardTaskStats,
  type DashboardTeamStats,
} from "@/hooks/useCoreQueries";
import {
  SkeletonDashboard,
  SkeletonTable,
  SkeletonList,
  RefreshingIndicator,
} from "@/components/skeletons/AppSkeletons";



// Keeps the My Tasks / All Tasks selection for the duration of the session.
let sessionDashTaskScope: "my" | "all" | null = null;

const DashboardExecutive = () => {
  const { user, workspaceRole, activeCompanyId, workspaces, setActiveCompanyId, refreshWorkspaces } = useAuth();
  const { toast } = useToast();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [taskSearch, setTaskSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [sideColumnOpen, setSideColumnOpen] = useState(true);
  const preferredSideColumnOpen = useRef(true);
  const [boardSideColumnOpen, setBoardSideColumnOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const workspaceSwitchAttempted = useRef<string | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("workspaceId");
    if (!requested || requested === activeCompanyId) return;
    const switchWhenAvailable = (items: typeof workspaces) => {
      if (items.some((workspace) => workspace.id === requested)) setActiveCompanyId(requested);
    };
    if (workspaces.some((workspace) => workspace.id === requested)) switchWhenAvailable(workspaces);
    else if (workspaceSwitchAttempted.current !== requested) {
      workspaceSwitchAttempted.current = requested;
      void refreshWorkspaces().then(switchWhenAvailable).catch(() => {});
    }
  }, [activeCompanyId, refreshWorkspaces, setActiveCompanyId, workspaces]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState("details");

  const canSeeTeamAdmin =
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager";

  const dashboardQuery = useDashboardData();
  const pendingQuery = usePendingVerificationsQuery(canSeeTeamAdmin);
  const { patchTaskEverywhere, removeTaskEverywhere, invalidateTasks } =
    useTaskCacheUpdater();

  const teamStats: DashboardTeamStats = dashboardQuery.data?.teamStats ?? {
    membership: null,
    totalAssistants: 0,
    availableAssistants: 0,
    pendingVerifications: 0,
    totalExecutives: 0,
  };

  const taskStats: DashboardTaskStats = dashboardQuery.data?.taskStats ?? {
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    urgentTasks: 0,
    completionRate: 0,
  };

  const myStats: DashboardTaskStats = dashboardQuery.data?.myStats ?? taskStats;

  const pendingAssistants: TeamMember[] = pendingQuery.data ?? [];

  // Cached data stays visible: only show the skeleton on a true cold start.
  const loading = dashboardQuery.isPending && !dashboardQuery.data;
  const teamLoading = pendingQuery.isPending && !pendingQuery.data;
  const isRefreshing = dashboardQuery.isFetching && !loading;


  const canCreateTask = canPerformRoleOperation("create_tasks", workspaceRole);

  const canViewAllTasks = canPerformRoleOperation("view_all_tasks", workspaceRole);

  const hasTaskViewFilter =
    (workspaceRole === "admin" ||
      workspaceRole === "manager" ||
      workspaceRole === "member") &&
    !canViewAllTasks;

  const canViewTeamAdminSections =
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager";

  const canManageTeam =
    workspaceRole === "owner" || workspaceRole === "admin";

  const canAccessCompanySettings =
    workspaceRole === "owner" || workspaceRole === "admin";

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const showTaskScopeToggle = workspaceRole !== "member" && canViewAllTasks;
  const [taskScope, setTaskScope] = useState<"my" | "all">(
    () => sessionDashTaskScope ?? "all"
  );
  const selectTaskScope = (next: "my" | "all") => {
    sessionDashTaskScope = next;
    setTaskScope(next);
    setCurrentPage(1);
  };

  // Personal view = canonical My Tasks (created by me OR assigned to me), always server-computed.
  const personalView = workspaceRole === "member" || (showTaskScopeToggle && taskScope === "my");
  const shownStats: DashboardTaskStats = personalView ? myStats : taskStats;
  const taskScopeKey = personalView ? "my" : "all";
  const allTasksQueryKey = ["dashboard-all-tasks", activeCompanyId, taskScopeKey] as const;
  const allTasksQuery = useInfiniteQuery({
    queryKey: allTasksQueryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.getAllTasksCrossWorkspace({
      scope: personalView ? "assigned_workspace" : "workspace",
      page: pageParam,
      limit: 100,
    }),
    enabled: Boolean(activeCompanyId),
    getNextPageParam: (lastPage, allPages) => {
      const pageTasks = lastPage.data?.tasks || [];
      const total = lastPage.total ?? lastPage.pagination?.totalResults;
      if (lastPage.pagination) return lastPage.pagination.hasNextPage ? allPages.length + 1 : undefined;
      if (total !== undefined) return allPages.reduce((count, page) => count + (page.data?.tasks?.length || 0), 0) < total ? allPages.length + 1 : undefined;
      return pageTasks.length === 100 ? allPages.length + 1 : undefined;
    },
    staleTime: 30_000,
  });
  const { data: allTasksData, hasNextPage, isFetchingNextPage, fetchNextPage } = allTasksQuery;
  const sourceTasks = filterTopLevelTasks(allTasksData?.pages.flatMap((page) => page.data?.tasks || []) || []);
  const taskPopulationComplete = !hasNextPage && !isFetchingNextPage;

  // Render the first authorized page immediately, then finish loading the set
  // in the background so local filters and the board eventually remain complete.
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const sideRailOpen = taskView === "board" ? boardSideColumnOpen : sideColumnOpen;

  useEffect(() => {
    if (taskView === "board") setBoardSideColumnOpen(false);
    else setSideColumnOpen(preferredSideColumnOpen.current);
  }, [taskView]);

  const updateSideRailOpen = (open: boolean) => {
    if (taskView === "board") setBoardSideColumnOpen(open);
    else {
      preferredSideColumnOpen.current = open;
      setSideColumnOpen(open);
    }
  };
  const filterOptions = useMemo(() => {
    const projects = new Map<string, string>();
    const teams = new Map<string, string>();
    const assignees = new Map<string, string>();
    sourceTasks.forEach((task: any) => {
      if (task.project?.id) projects.set(String(task.project.id), task.project.name);
      if (task.team?.id) teams.set(String(task.team.id), task.team.name);
      const people = task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [];
      people.forEach((person: any) => person?.id && assignees.set(String(person.id), `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unassigned"));
    });
    return { projects: [...projects], teams: [...teams], assignees: [...assignees] };
  }, [sourceTasks]);

  const filteredTasks = sourceTasks.filter((task: any) => {
    const haystack = `${task.title || ""} ${task.description || ""} ${task.project?.name || ""} ${task.team?.name || ""}`.toLowerCase();
    const people = task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [];
    if (taskSearch && !haystack.includes(taskSearch.toLowerCase())) return false;
    if (statusFilter && task.status !== statusFilter) return false;
    if (projectFilter && String(task.project?.id || task.projectId || "") !== projectFilter) return false;
    if (teamFilter && String(task.team?.id || task.teamId || "") !== teamFilter) return false;
    if (assigneeFilter && !people.some((person: any) => String(person?.id) === assigneeFilter)) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    return true;
  });

  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const fetchDashboard = () => {
    invalidateTasks();
    dashboardQuery.refetch();
  };

  const fetchPendingAssistants = () => {
    pendingQuery.refetch();
  };

  useEffect(() => {
    if (!dashboardQuery.isError) return;
    toast({
      title: "Error",
      description:
        dashboardQuery.error instanceof Error
          ? dashboardQuery.error.message
          : "Failed to load dashboard",
      variant: "destructive",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardQuery.isError]);


  const handleTaskCreated = () => {
    fetchDashboard();
    void queryClient.invalidateQueries({ queryKey: ["dashboard-all-tasks", activeCompanyId] });
    setCreateTaskOpen(false);
    setCurrentPage(1);
  };

  const handleVerifyAssistant = async (assistantId: string) => {
    try {
      await api.verifyAssistant(assistantId);

      toast({
        title: "Team member verified",
        description: "The team member can now receive tasks.",
      });

      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectAssistant = async (assistantId: string) => {
    try {
      await api.rejectAssistant(assistantId);

      toast({
        title: "Team member rejected",
        description: "The registration has been removed.",
      });

      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDrawer = (task: Task, tab: string) => {
    setDrawerTaskId(task.id);
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    // Optimistic: patch every cached list instantly, then refresh in background.
    patchTaskEverywhere(updatedTask.id, updatedTask as any);
    queryClient.setQueryData<Task[]>(allTasksQueryKey, (current) =>
      current?.map((task) => task.id === updatedTask.id ? updatedTask : task)
    );
    dashboardQuery.refetch();
  };

  const handleTaskDeleted = (taskId: string) => {
    removeTaskEverywhere(taskId);
    queryClient.setQueryData<Task[]>(allTasksQueryKey, (current) =>
      current?.filter((task) => task.id !== taskId)
    );
    dashboardQuery.refetch();
  };

  if (loading) {
    return (
      <DashboardLayout fullWidth>
        <div className="px-4 py-6">
          <SkeletonDashboard />
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout fullWidth>
      <PageHeader
        title={`Welcome back, ${user?.firstName}!`}
        description={
          workspaceRole === "member"
            ? "Track your assigned work and request additional workspace access when needed."
            : "Manage your team, monitor execution, and control workspace access."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshingIndicator active={isRefreshing} className="mr-1" />

            <Button variant="outline" asChild className="gap-2">
              <Link to="/workspace-access">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Workspace Access</span>
                <span className="sm:hidden">Access</span>
              </Link>
            </Button>

            {workspaceRole !== "member" && (
              <Button
                asChild
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="/assistance-requests">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Hire Talent</span>
                  <span className="sm:hidden">Hire</span>
                </Link>
              </Button>
            )}

          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="dashboard-stats">
        <StatsCard
          title={personalView ? "My Tasks" : "Total Tasks"}
          value={shownStats.totalTasks}
          icon={ClipboardList}
          iconClassName="bg-primary/10"
          className="p-3 sm:p-3.5"
        />

        <StatsCard
          title="Completion Rate"
          value={`${shownStats.completionRate}%`}
          icon={TrendingUp}
          iconClassName="bg-success/10"
          className="p-3 sm:p-3.5"
        />

        <StatsCard
          title="In Progress"
          value={shownStats.inProgressTasks}
          icon={Clock}
          iconClassName="bg-info/10"
          className="p-3 sm:p-3.5"
        />

        <StatsCard
          title="Overdue"
          value={shownStats.overdueTasks}
          icon={AlertTriangle}
          iconClassName="bg-destructive/10"
          className="p-3 sm:p-3.5"
        />
      </div>

      {(() => {
        const teamOverview = (
          <Collapsible defaultOpen>
            <ContentCard>
              <div className="flex items-center justify-between gap-2">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-left flex-1 group">
                    <ChevronDown className="w-4 h-4 transition-transform group-data-[state=closed]:-rotate-90 text-muted-foreground" />
                    <h2 className="text-base font-semibold tracking-tight">Team Overview</h2>
                  </button>
                </CollapsibleTrigger>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/team-directory" className="gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">View All</span>
                  </Link>
                </Button>
              </div>
              <CollapsibleContent>
                {teamStats.membership ? (
                  <div data-testid="team-overview" className="mt-3 space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Workspace Members</p>
                        <p className="text-base font-semibold" data-testid="count-workspace-members">{teamStats.membership.workspaceMembers}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-success/8 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Members</p>
                        <p className="text-base font-semibold text-success" data-testid="count-members">{teamStats.membership.members}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-info/8 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Managers</p>
                        <p className="text-base font-semibold" data-testid="count-managers">{teamStats.membership.managers}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-primary/8 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Owners &amp; Admins</p>
                        <p className="text-base font-semibold text-primary" data-testid="count-owners-admins">{teamStats.membership.owners + teamStats.membership.admins}</p>
                      </div>
                    </div>
                    <dl className="space-y-1.5 text-xs">
                      {teamStats.membership.pendingInvitations > 0 && <div className="flex items-center justify-between rounded-md border px-3 py-1.5"><dt className="text-muted-foreground">Pending invitations</dt><dd className="font-semibold text-warning" data-testid="count-pending-invitations">{teamStats.membership.pendingInvitations}</dd></div>}
                      {teamStats.membership.pendingJoinRequests !== null && teamStats.membership.pendingJoinRequests > 0 && (
                        <div className="flex items-center justify-between rounded-md border border-warning/30 bg-warning/5 px-3 py-1.5"><dt className="text-muted-foreground"><Link to="/settings/workspace/join-requests" className="underline-offset-2 hover:underline">Pending join requests</Link></dt><dd className="font-semibold text-warning" data-testid="count-pending-join-requests">{teamStats.membership.pendingJoinRequests}</dd></div>
                      )}
                    </dl>
                    <p className="text-[10px] leading-snug text-muted-foreground">Active workspace members only.</p>
                  </div>
                ) : (
                  <p className={cn("mt-4 text-sm", dashboardQuery.isError ? "text-destructive" : "text-muted-foreground")} role="status">
                    {dashboardQuery.isPending && !dashboardQuery.data ? "Loading member counts…" : dashboardQuery.isError ? "Member counts could not be loaded." : "Member counts are temporarily unavailable."}
                  </p>
                )}
              </CollapsibleContent>
            </ContentCard>
          </Collapsible>
        );

        const quickActions = (
          <Collapsible defaultOpen>
            <ContentCard>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left w-full group">
                  <ChevronDown className="w-4 h-4 transition-transform group-data-[state=closed]:-rotate-90 text-muted-foreground" />
                  <h2 className="text-base font-semibold tracking-tight">Quick Actions</h2>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 grid grid-cols-1 gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2 text-xs" asChild>
                    <Link to="/workspace-access">
                      <ShieldCheck className="w-4 h-4" />
                      Workspace Access
                    </Link>
                  </Button>
                  {canCreateTask && (
                    <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2 text-xs" onClick={() => setCreateTaskOpen(true)}>
                      <Plus className="w-4 h-4" />
                      Create Task
                    </Button>
                  )}
                  {workspaceRole !== "member" && (
                    <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2 text-xs" onClick={() => setInviteOpen(true)}>
                      <Mail className="w-4 h-4" />
                      Invite Team Member
                    </Button>
                  )}
                  {canManageTeam && (
                    <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2 text-xs" asChild>
                      <Link to="/team-management">
                        <Users className="w-4 h-4" />
                        Manage Team
                      </Link>
                    </Button>
                  )}
                  {canAccessCompanySettings && (
                    <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2 text-xs" asChild>
                      <Link to="/company-profile">
                        <User className="w-4 h-4" />
                        Company Settings
                      </Link>
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </ContentCard>
          </Collapsible>
        );

        const pendingVerifications = canViewTeamAdminSections && teamStats.pendingVerifications > 0 ? (
          <ContentCard className="mt-5">
            <SectionHeader title="Pending Verifications" actions={<Badge variant="outline" className="bg-warning/10 text-warning">{pendingAssistants.length} waiting</Badge>} />
            {teamLoading ? <div className="mt-4"><SkeletonList rows={3} /></div> : <div className="mt-4 space-y-3">
              {pendingAssistants.map((teamMember) => <div key={teamMember.id} className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><User className="h-5 w-5 text-primary" /></div><div><p className="font-semibold">{teamMember.firstName} {teamMember.lastName}</p><p className="text-sm text-muted-foreground">{teamMember.email}</p><div className="mt-1 flex gap-2">{teamMember.specialization && <Badge variant="outline" className="text-xs">{teamMember.specialization}</Badge>}{teamMember.experience && <Badge variant="outline" className="text-xs">{teamMember.experience} yrs exp</Badge>}</div></div></div>
                <div className="flex gap-2"><Button size="sm" onClick={() => handleVerifyAssistant(teamMember.id)}><CheckCircle2 className="mr-1 h-4 w-4" />Approve</Button><Button size="sm" variant="outline" onClick={() => handleRejectAssistant(teamMember.id)}>Reject</Button></div>
              </div>)}
            </div>}
          </ContentCard>
        ) : null;

        const pendingJoinRequests = canManageTeam && (teamStats.membership?.pendingJoinRequests || 0) > 0 ? <div className="mt-4"><JoinRequestsPreview compact /></div> : null;

        const tasksSection = (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 overflow-x-auto flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 pr-1">
                  <h2 className="text-sm font-semibold">Tasks</h2>
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {totalItems} {taskPopulationComplete ? (personalView ? "created by or assigned to you" : "total tasks") : "tasks loaded…"}
                  </span>
                </div>
                {showTaskScopeToggle && (
                  <div
                    role="tablist"
                    aria-label="Task scope"
                    className="inline-flex shrink-0 items-center rounded-lg border border-border bg-muted/50 p-0.5"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={taskScope === "my"}
                      onClick={() => selectTaskScope("my")}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition",
                        taskScope === "my"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      My Tasks
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={taskScope === "all"}
                      onClick={() => selectTaskScope("all")}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition",
                        taskScope === "all"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All Tasks
                    </button>
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-card p-1.5 shadow-soft">
                  <div className="relative min-w-[180px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input aria-label="Search tasks" value={taskSearch} onChange={(event) => { setTaskSearch(event.target.value); setCurrentPage(1); }} placeholder="Search tasks" className="h-8 w-full rounded-lg border-0 bg-muted/40 pl-8 pr-2 text-xs outline-none ring-0 placeholder:text-muted-foreground/70 focus:bg-background focus:ring-2 focus:ring-primary/15" />
                  </div>
                  <select aria-label="Filter by project" value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setCurrentPage(1); }} className="h-8 max-w-[132px] rounded-lg border-0 bg-muted/40 px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/15">
                    <option value="">All projects</option>{filterOptions.projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                  <select aria-label="Filter by team" value={teamFilter} onChange={(event) => { setTeamFilter(event.target.value); setCurrentPage(1); }} className="h-8 max-w-[120px] rounded-lg border-0 bg-muted/40 px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/15">
                    <option value="">All teams</option>{filterOptions.teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                  <select aria-label="Filter by assignee" value={assigneeFilter} onChange={(event) => { setAssigneeFilter(event.target.value); setCurrentPage(1); }} className="h-8 max-w-[132px] rounded-lg border-0 bg-muted/40 px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/15">
                    <option value="">All assignees</option>{filterOptions.assignees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                  <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value); setCurrentPage(1); }} className="h-8 max-w-[112px] rounded-lg border-0 bg-muted/40 px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/15">
                    <option value="">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                  <select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} className="h-8 max-w-[120px] rounded-lg border-0 bg-muted/40 px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/15">
                    <option value="">All statuses</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="completed">Completed</option><option value="delayed">Delayed</option><option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" aria-label="Filter options" className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:flex"><SlidersHorizontal className="h-3.5 w-3.5" /></button>
                </div>
                <div role="tablist" aria-label="Task view" className="inline-flex shrink-0 items-center rounded-lg border border-border bg-muted/50 p-0.5">
                  <button type="button" role="tab" aria-selected={taskView === "list"} onClick={() => setTaskView("list")} className={cn("rounded-md px-2.5 py-1 text-xs font-medium", taskView === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><LayoutList className="mr-1 inline h-3.5 w-3.5" />List</button>
                  <button type="button" role="tab" aria-selected={taskView === "board"} onClick={() => setTaskView("board")} className={cn("rounded-md px-2.5 py-1 text-xs font-medium", taskView === "board" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><Columns3 className="mr-1 inline h-3.5 w-3.5" />Board</button>
                </div>
                {canCreateTask && <Button onClick={() => setCreateTaskOpen(true)} size="sm" className="h-8 shrink-0 gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>}
              </div>
              {taskView === "list" && totalPages > 1 && (
                <div className="flex items-center justify-end gap-1 shrink-0">
                  <span className="text-[11px] text-muted-foreground mr-1">
                    {startIndex + 1}–{Math.min(endIndex, totalItems)} / {totalItems}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] font-semibold px-2">
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {hasTaskViewFilter && (
              <p className="text-xs text-muted-foreground">
                You're viewing tasks created by or assigned to you based on workspace policy.
              </p>
            )}

            {allTasksQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground" role="status">Loading tasks…</div>
            ) : allTasksQuery.isError ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm" role="alert">
                <span>Could not load authorized tasks. Please try again.</span>
                <Button variant="outline" size="sm" onClick={() => void allTasksQuery.refetch()}>Retry</Button>
              </div>
            ) : filteredTasks.length === 0 ? (
              <ContentCard>
                <EmptyState
                  icon={ClipboardList}
                  title="No tasks found"
                  description={canCreateTask ? "Create your first task to get started." : "No assigned tasks were found."}
                  action={
                    canCreateTask ? (
                      <Button onClick={() => setCreateTaskOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    ) : (
                      <Button variant="outline" asChild>
                        <Link to="/workspace-access">
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Request Access
                        </Link>
                      </Button>
                    )
                  }
                />
              </ContentCard>
            ) : (
              <div className="animate-fade-in">
                {taskView === "board" ? <Board embeddedTasks={filteredTasks} hideEmbeddedControls onEmbeddedTaskUpdated={(updated) => {
                  patchTaskEverywhere(updated.id, updated as any);
                  queryClient.setQueryData<Task[]>(allTasksQueryKey, (current) =>
                    current?.map((task) => task.id === updated.id ? updated : task)
                  );
                }} /> : <TaskTable
                  tasks={currentTasks}
                  showAssignee={workspaceRole !== "member"}
                  showExecutive
                  showActions={workspaceRole !== "member"}
                  onStatusChange={(taskId, status) => {
                    patchTaskEverywhere(taskId, { status: status as any });
                    queryClient.setQueryData<Task[]>(allTasksQueryKey, (current) =>
                      current?.map((task) => task.id === taskId ? { ...task, status: status as any } : task)
                    );
                  }}

                  onEdit={workspaceRole !== "member" ? (task) => openDrawer(task, "details") : undefined}
                  onAssign={workspaceRole !== "member" ? (task) => openDrawer(task, "assignees") : undefined}
                  onDelete={workspaceRole !== "member" ? (task) => openDrawer(task, "danger") : undefined}
                />}
              </div>
            )}
            {pendingVerifications}
          </div>
        );

        if (workspaceRole === "member") {
          return <div className="space-y-4">{tasksSection}</div>;
        }

        return (
          <>
            {/* Mobile / tablet stacked — overview + quick actions collapsible */}
            <div className="space-y-4 lg:hidden">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => updateSideRailOpen(!sideRailOpen)}
                >
                  {sideRailOpen ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" /> Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" /> Show Overview
                    </>
                  )}
                </Button>
              </div>
              {sideRailOpen && (
                <div className="space-y-4 animate-fade-in">
                  {teamOverview}
                  {quickActions}
                  {pendingJoinRequests}
                </div>
              )}
              {tasksSection}
            </div>

            {/* Desktop resizable with collapsible side column */}
            <div className="hidden lg:block">
              <div className="flex h-[calc(100dvh-16rem)] min-h-[22rem] gap-1">
                {!sideRailOpen && (
                  <div className="shrink-0 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 px-2 text-[11px]"
                      aria-label="Show Overview"
                      onClick={() => updateSideRailOpen(true)}
                    >
                      <ChevronRight className="h-4 w-4" />
                      Show Overview
                    </Button>
                  </div>
                )}
                <ResizablePanelGroup
                  direction="horizontal"
                  className="h-full flex-1 rounded-xl"
                >
                  {sideRailOpen && (
                    <>
                      <ResizablePanel id="side" order={1} defaultSize={21} minSize={18} maxSize={27}>
                        <div className="pr-2 space-y-3 h-full overflow-y-auto">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => updateSideRailOpen(false)}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" /> Collapse
                            </Button>
                          </div>
                          {teamOverview}
                          {quickActions}
                          {pendingJoinRequests}
                        </div>
                      </ResizablePanel>
                      <ResizableHandle withHandle className="bg-transparent mx-1" />
                    </>
                  )}
                  <ResizablePanel id="main" order={2} defaultSize={sideRailOpen ? 79 : 100} minSize={73}>
                    <div className={cn("h-full overflow-y-auto", sideRailOpen && "pl-3")}>
                      {tasksSection}
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>

          </>
        );
      })()}

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onSuccess={handleTaskCreated}
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={fetchDashboard}
      />

      <TaskEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        taskId={drawerTaskId}
        initialTab={drawerTab}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </DashboardLayout>
  );
};

export default DashboardExecutive;
