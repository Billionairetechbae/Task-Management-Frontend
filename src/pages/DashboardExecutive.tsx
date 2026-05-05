import { useState, useEffect } from "react";
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
  Pagination,
} from "@/components/dashboard/TaskComponents";
import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";

import { useAuth } from "@/contexts/AuthContext";
import { api, Task, TeamMember } from "@/lib/api";
import { filterTopLevelTasks } from "@/lib/taskListUtils";
import { useToast } from "@/hooks/use-toast";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import InviteUserDialog from "@/components/InviteUserDialog";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";

const DashboardExecutive = () => {
  const { user, workspaceRole } = useAuth();
  const { toast } = useToast();
  const { canPerformRoleOperation } = useWorkspaceSettings();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState("details");

  const [teamStats, setTeamStats] = useState({
    totalAssistants: 0,
    availableAssistants: 0,
    pendingVerifications: 0,
    totalExecutives: 0,
  });

  const [taskStats, setTaskStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    urgentTasks: 0,
    completionRate: 0,
  });

  const [pendingAssistants, setPendingAssistants] = useState<TeamMember[]>([]);

  const canCreateTask = canPerformRoleOperation("create_tasks", workspaceRole);

  const hasTaskViewFilter =
    (workspaceRole === "admin" ||
      workspaceRole === "manager" ||
      workspaceRole === "member") &&
    !canPerformRoleOperation("view_all_tasks", workspaceRole);

  const canViewTeamAdminSections =
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager";

  const canManageTeam =
    workspaceRole === "owner" || workspaceRole === "admin";

  const canAccessCompanySettings =
    workspaceRole === "owner" || workspaceRole === "admin";

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTasks = statusFilter
    ? tasks.filter((task) => task.status === statusFilter)
    : tasks;

  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      if (workspaceRole === "member") {
        const res = await api.getTasks();
        const wsTasks = (res as any)?.data?.tasks || [];

        const mine = filterTopLevelTasks(
          wsTasks.filter((task: any) => {
            if (task.assigneeId && task.assigneeId === user?.id) return true;

            if (
              Array.isArray(task.assignees) &&
              task.assignees.some((assignee: any) => assignee?.id === user?.id)
            ) {
              return true;
            }

            return false;
          })
        ) as Task[];

        setTasks(mine);

        const counts = {
          total: mine.length,
          pending: mine.filter((task: any) => task.status === "pending").length,
          inProgress: mine.filter(
            (task: any) => task.status === "in_progress"
          ).length,
          completed: mine.filter(
            (task: any) => task.status === "completed"
          ).length,
          overdue: mine.filter((task: any) => {
            if (!task.deadline) return false;

            return (
              task.status !== "completed" &&
              new Date(task.deadline).getTime() < Date.now()
            );
          }).length,
          urgent: mine.filter((task: any) => task.priority === "urgent").length,
        };

        const completionRate =
          counts.total > 0
            ? Math.round((counts.completed / counts.total) * 100)
            : 0;

        setTeamStats({
          totalAssistants: 0,
          availableAssistants: 0,
          pendingVerifications: 0,
          totalExecutives: 0,
        });

        setTaskStats({
          totalTasks: counts.total,
          pendingTasks: counts.pending,
          inProgressTasks: counts.inProgress,
          completedTasks: counts.completed,
          overdueTasks: counts.overdue,
          urgentTasks: counts.urgent,
          completionRate,
        });

        return;
      }

      const response = await api.getExecutiveDashboard();

      const {
        overview = {
          team: {
            totalAssistants: 0,
            availableAssistants: 0,
            pendingVerifications: 0,
            totalExecutives: 0,
          },
          tasks: {
            totalTasks: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            urgentTasks: 0,
            completionRate: 0,
          },
        },
        recentActivity = { tasks: [] as Task[] },
      } = response.data || {};

      const { team, tasks: taskOverview } = overview;

      setTasks(filterTopLevelTasks(recentActivity.tasks || []));

      setTeamStats({
        totalAssistants: team.totalAssistants || 0,
        availableAssistants: team.availableAssistants || 0,
        pendingVerifications: team.pendingVerifications || 0,
        totalExecutives: team.totalExecutives || 0,
      });

      setTaskStats({
        totalTasks: taskOverview.totalTasks || 0,
        pendingTasks: taskOverview.pendingTasks || 0,
        inProgressTasks: taskOverview.inProgressTasks || 0,
        completedTasks: taskOverview.completedTasks || 0,
        overdueTasks: taskOverview.overdueTasks || 0,
        urgentTasks: taskOverview.urgentTasks || 0,
        completionRate: taskOverview.completionRate || 0,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAssistants = async () => {
    if (!canViewTeamAdminSections) {
      setPendingAssistants([]);
      return;
    }

    try {
      setTeamLoading(true);

      const response = await api.getPendingVerifications();
      setPendingAssistants(response.data.pendingAssistants || []);
    } catch (error) {
      console.error("Failed to fetch pending team members:", error);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchPendingAssistants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRole, user?.id]);

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
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading your dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${user?.firstName}!`}
        description={
          workspaceRole === "member"
            ? "Track your assigned work and request additional workspace access when needed."
            : "Manage your team, monitor execution, and control workspace access."
        }
        actions={
          <div className="flex flex-wrap gap-2">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard
          title={workspaceRole === "member" ? "My Tasks" : "Total Tasks"}
          value={taskStats.totalTasks}
          icon={ClipboardList}
          iconClassName="bg-primary/10"
        />

        <StatsCard
          title="Completion Rate"
          value={`${taskStats.completionRate}%`}
          icon={TrendingUp}
          iconClassName="bg-success/10"
        />

        <StatsCard
          title={workspaceRole === "member" ? "My In Progress" : "In Progress"}
          value={taskStats.inProgressTasks}
          icon={Clock}
          iconClassName="bg-info/10"
        />

        <StatsCard
          title={workspaceRole === "member" ? "My Overdue" : "Overdue"}
          value={taskStats.overdueTasks}
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
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{teamStats.totalAssistants}</p>
                    <p className="text-xs text-muted-foreground">Team Members</p>
                  </div>
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <p className="text-xl font-bold text-success">{teamStats.availableAssistants}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div className="text-center p-3 bg-warning/10 rounded-lg">
                    <p className="text-xl font-bold text-warning">{teamStats.pendingVerifications}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <p className="text-xl font-bold text-primary">{teamStats.totalExecutives}</p>
                    <p className="text-xs text-muted-foreground">Executives</p>
                  </div>
                </div>
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

        const tasksSection = (
          <div className="space-y-4">
            <SectionHeader
              title={workspaceRole === "member" ? "My Tasks" : "Recent Tasks"}
              description={
                totalItems > 0
                  ? `${totalItems} ${workspaceRole === "member" ? "assigned tasks" : "total tasks"}`
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

            <TaskFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} />

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
              <>
                <TaskTable
                  tasks={currentTasks}
                  showAssignee={workspaceRole !== "member"}
                  showExecutive
                  showActions={workspaceRole !== "member"}
                  onStatusChange={(taskId, status) =>
                    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: status as any } : t)))
                  }
                  onEdit={workspaceRole !== "member" ? (task) => openDrawer(task, "details") : undefined}
                  onAssign={workspaceRole !== "member" ? (task) => openDrawer(task, "assignees") : undefined}
                  onDelete={workspaceRole !== "member" ? (task) => openDrawer(task, "danger") : undefined}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        );

        if (workspaceRole === "member") {
          return <div className="space-y-4">{tasksSection}</div>;
        }

        return (
          <>
            {/* Mobile / tablet stacked */}
            <div className="space-y-4 lg:hidden">
              {teamOverview}
              {quickActions}
              {tasksSection}
            </div>

            {/* Desktop resizable */}
            <div className="hidden lg:block">
              <ResizablePanelGroup
                direction="horizontal"
                className="min-h-[600px] rounded-xl"
              >
                <ResizablePanel defaultSize={35} minSize={22} maxSize={55}>
                  <div className="pr-3 space-y-4 h-full overflow-y-auto">
                    {teamOverview}
                    {quickActions}
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-transparent mx-1" />
                <ResizablePanel defaultSize={65} minSize={45}>
                  <div className="pl-3 h-full overflow-y-auto">{tasksSection}</div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </>
        );
      })()}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
          />
        </>
      )}

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