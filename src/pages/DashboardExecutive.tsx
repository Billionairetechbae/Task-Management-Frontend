import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

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
  TaskFilters,
} from "@/components/dashboard/TaskComponents";
import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";

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

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sideColumnOpen, setSideColumnOpen] = useState(true);
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

  const tasks: Task[] = dashboardQuery.data?.tasks ?? [];
  const myTasks: Task[] = dashboardQuery.data?.myTasks ?? [];

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
  const filteredTasks = (personalView ? myTasks : tasks).filter((task) => {
    if (statusFilter && task.status !== statusFilter) return false;
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
    dashboardQuery.refetch();
  };

  const handleTaskDeleted = (taskId: string) => {
    removeTaskEverywhere(taskId);
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

            {canCreateTask && (
              <Button
                variant={workspaceRole === "member" ? "default" : "outline"}
                onClick={() => setCreateTaskOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {workspaceRole === "member" ? "Create Task" : "Delegate Task"}
                </span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        }
      />

      <div className={cn("grid grid-cols-2 gap-3 mb-6", personalView ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-4")} data-testid="dashboard-stats">
        <StatsCard
          title={personalView ? "My Tasks" : "Total Tasks"}
          value={shownStats.totalTasks}
          icon={ClipboardList}
          iconClassName="bg-primary/10"
        />

        <StatsCard
          title="Completion Rate"
          value={`${shownStats.completionRate}%`}
          icon={TrendingUp}
          iconClassName="bg-success/10"
        />

        {personalView && (
          <StatsCard title="My Pending" value={shownStats.pendingTasks} icon={Clock} iconClassName="bg-warning/10" />
        )}

        <StatsCard
          title={personalView ? "My In Progress" : "In Progress"}
          value={shownStats.inProgressTasks}
          icon={Clock}
          iconClassName="bg-info/10"
        />

        {personalView && (
          <StatsCard title="My Completed" value={shownStats.completedTasks} icon={TrendingUp} iconClassName="bg-success/10" />
        )}

        <StatsCard
          title={personalView ? "My Overdue" : "Overdue"}
          value={shownStats.overdueTasks}
          icon={AlertTriangle}
          iconClassName="bg-destructive/10"
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
                  <div data-testid="team-overview" className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xl font-bold" data-testid="count-workspace-members">{teamStats.membership.workspaceMembers}</p>
                        <p className="text-xs text-muted-foreground">Workspace Members</p>
                      </div>
                      <div className="text-center p-3 bg-success/10 rounded-lg">
                        <p className="text-xl font-bold text-success" data-testid="count-members">{teamStats.membership.members}</p>
                        <p className="text-xs text-muted-foreground">Members</p>
                      </div>
                      <div className="text-center p-3 bg-info/10 rounded-lg">
                        <p className="text-xl font-bold" data-testid="count-managers">{teamStats.membership.managers}</p>
                        <p className="text-xs text-muted-foreground">Managers</p>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded-lg">
                        <p className="text-xl font-bold text-primary" data-testid="count-owners-admins">{teamStats.membership.owners + teamStats.membership.admins}</p>
                        <p className="text-xs text-muted-foreground">Owners &amp; Admins</p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-md border px-3 py-2"><dt className="text-muted-foreground">Pending invitations</dt><dd className="font-semibold text-warning" data-testid="count-pending-invitations">{teamStats.membership.pendingInvitations}</dd></div>
                      {teamStats.membership.pendingJoinRequests !== null && (
                        <div className="flex items-center justify-between rounded-md border px-3 py-2"><dt className="text-muted-foreground"><Link to="/settings/workspace/join-requests" className="underline-offset-2 hover:underline">Pending join requests</Link></dt><dd className="font-semibold text-warning" data-testid="count-pending-join-requests">{teamStats.membership.pendingJoinRequests}</dd></div>
                      )}
                    </dl>
                    <p className="text-[11px] leading-snug text-muted-foreground">Active workspace members only. Invited people, join requests and deactivated accounts are not counted as members.</p>
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
                <div className="space-y-2 mt-4">
                  <Button variant="outline" className="w-full justify-start gap-3" asChild>
                    <Link to="/workspace-access">
                      <ShieldCheck className="w-4 h-4" />
                      Workspace Access
                    </Link>
                  </Button>
                  {canCreateTask && (
                    <Button variant="outline" className="w-full justify-start gap-3" onClick={() => setCreateTaskOpen(true)}>
                      <Plus className="w-4 h-4" />
                      Create Task
                    </Button>
                  )}
                  {workspaceRole !== "member" && (
                    <Button variant="outline" className="w-full justify-start gap-3" onClick={() => setInviteOpen(true)}>
                      <Mail className="w-4 h-4" />
                      Invite Team Member
                    </Button>
                  )}
                  {canManageTeam && (
                    <Button variant="outline" className="w-full justify-start gap-3" asChild>
                      <Link to="/team-management">
                        <Users className="w-4 h-4" />
                        Manage Team
                      </Link>
                    </Button>
                  )}
                  {canAccessCompanySettings && (
                    <Button variant="outline" className="w-full justify-start gap-3" asChild>
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

        const pendingJoinRequests = canManageTeam ? <div className="mt-5"><JoinRequestsPreview /></div> : null;

        const tasksSection = (
          <div className="space-y-4">
            <SectionHeader
              title={
                personalView ? "My Tasks" : "Recent Tasks"
              }
              description={
                totalItems > 0
                  ? `${totalItems} ${personalView ? "created by or assigned to you" : "total tasks"}`
                  : undefined
              }
              actions={
                canCreateTask ? (
                  <Button onClick={() => setCreateTaskOpen(true)} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Task
                  </Button>
                ) : undefined
              }
            />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 overflow-x-auto flex flex-wrap items-center gap-2">
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
                <TaskFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} />
              </div>
              {totalPages > 1 && (
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

            {filteredTasks.length === 0 ? (
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
                <TaskTable
                  tasks={currentTasks}
                  showAssignee={workspaceRole !== "member"}
                  showExecutive
                  showActions={workspaceRole !== "member"}
                  onStatusChange={(taskId, status) =>
                    patchTaskEverywhere(taskId, { status: status as any })
                  }

                  onEdit={workspaceRole !== "member" ? (task) => openDrawer(task, "details") : undefined}
                  onAssign={workspaceRole !== "member" ? (task) => openDrawer(task, "assignees") : undefined}
                  onDelete={workspaceRole !== "member" ? (task) => openDrawer(task, "danger") : undefined}
                />
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
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Overview
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setSideColumnOpen((v) => !v)}
                >
                  {sideColumnOpen ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" /> Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" /> Show
                    </>
                  )}
                </Button>
              </div>
              {sideColumnOpen && (
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
                {!sideColumnOpen && (
                  <div className="w-11 shrink-0 flex flex-col items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Show overview column"
                      onClick={() => setSideColumnOpen(true)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
                      Overview
                    </span>
                  </div>
                )}
                <ResizablePanelGroup
                  direction="horizontal"
                  className="h-full flex-1 rounded-xl"
                >
                  {sideColumnOpen && (
                    <>
                      <ResizablePanel id="side" order={1} defaultSize={29} minSize={26} maxSize={34}>
                        <div className="pr-2 space-y-3 h-full overflow-y-auto">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => setSideColumnOpen(false)}
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
                  <ResizablePanel id="main" order={2} defaultSize={sideColumnOpen ? 71 : 100} minSize={62}>
                    <div className={cn("h-full overflow-y-auto", sideColumnOpen && "pl-3")}>
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
