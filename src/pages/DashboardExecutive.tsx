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
} from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import InviteUserDialog from "@/components/InviteUserDialog";

const DashboardExecutive = () => {
  const { user, activeWorkspace, workspaceRole } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);

  // Drawer state
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

  // Pagination
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
      // For workspace members, show a limited dashboard focused on assigned tasks
      if (workspaceRole === "member") {
        const res = await api.getTasks();
        const wsTasks = (res as any)?.data?.tasks || [];
        const mine = wsTasks.filter((t: any) => {
          if (t.assigneeId && t.assigneeId === user?.id) return true;
          if (Array.isArray(t.assignees) && t.assignees.some((a: any) => a?.id === user?.id)) return true;
          return false;
        });
        setTasks(mine);
        const counts = {
          total: mine.length,
          pending: mine.filter((t: any) => t.status === "pending").length,
          inProgress: mine.filter((t: any) => t.status === "in_progress").length,
          completed: mine.filter((t: any) => t.status === "completed").length,
          overdue: mine.filter((t: any) => {
            if (!t.deadline) return false;
            return t.status !== "completed" && new Date(t.deadline).getTime() < Date.now();
          }).length,
          urgent: mine.filter((t: any) => t.priority === "urgent").length,
        };
        const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
        setTeamStats({ totalAssistants: 0, availableAssistants: 0, pendingVerifications: 0, totalExecutives: 0 });
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
      // Owner/Admin/Manager: full executive dashboard
      const response = await api.getExecutiveDashboard();

      const {
        overview = {
          team: { totalAssistants: 0, availableAssistants: 0, pendingVerifications: 0, totalExecutives: 0 },
          tasks: { totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0, urgentTasks: 0, completionRate: 0 },
        },
        recentActivity = { tasks: [] as Task[] },
      } = response.data || {};

      const { team, tasks: t } = overview;

      setTasks(recentActivity.tasks || []);
      setTeamStats({
        totalAssistants: team.totalAssistants || 0,
        availableAssistants: team.availableAssistants || 0,
        pendingVerifications: team.pendingVerifications || 0,
        totalExecutives: team.totalExecutives || 0,
      });
      setTaskStats({
        totalTasks: t.totalTasks || 0,
        pendingTasks: t.pendingTasks || 0,
        inProgressTasks: t.inProgressTasks || 0,
        completedTasks: t.completedTasks || 0,
        overdueTasks: t.overdueTasks || 0,
        urgentTasks: t.urgentTasks || 0,
        completionRate: t.completionRate || 0,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAssistants = async () => {
    try {
      setTeamLoading(true);
      const response = await api.getPendingVerifications();
      setPendingAssistants(response.data.pendingAssistants || []);
    } catch (error) {
      console.error("Failed to fetch pending team_members:", error);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchPendingAssistants();
  }, []);

  const handleTaskCreated = () => {
    fetchDashboard();
    setCreateTaskOpen(false);
    setCurrentPage(1);
  };

  const handleVerifyAssistant = async (assistantId: string) => {
    try {
      await api.verifyAssistant(assistantId);
      toast({ title: "TeamMember verified!", description: "The team_member can now receive tasks" });
      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectAssistant = async (assistantId: string) => {
    try {
      await api.rejectAssistant(assistantId);
      toast({ title: "TeamMember rejected", description: "The registration has been removed" });
      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    }
  };

  const openDrawer = (task: Task, tab: string) => {
    setDrawerTaskId(task.id);
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
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
        description={workspaceRole === "member"
          ? "Your workspace access is limited to your assigned tasks and progress"
          : "Manage your team and track task progress"}
        actions={
          workspaceRole === "member" ? undefined : (
            <div className="flex gap-3">
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
              <Button variant="outline" onClick={() => setCreateTaskOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Delegate Task</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          )
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title={workspaceRole === "member" ? "My Tasks" : "Total Tasks"} value={taskStats.totalTasks} icon={ClipboardList} iconClassName="bg-primary/10" />
        <StatsCard title="Completion Rate" value={`${taskStats.completionRate}%`} icon={TrendingUp} iconClassName="bg-success/10" />
        <StatsCard title={workspaceRole === "member" ? "My In Progress" : "In Progress"} value={taskStats.inProgressTasks} icon={Clock} iconClassName="bg-info/10" />
        <StatsCard title={workspaceRole === "member" ? "My Overdue" : "Overdue"} value={taskStats.overdueTasks} icon={AlertTriangle} iconClassName="bg-destructive/10" />
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ContentCard className="lg:col-span-2">
          <SectionHeader
            title="Team Overview"
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link to="/team-directory" className="gap-2">
                  <Users className="w-4 h-4" />
                  View All
                </Link>
              </Button>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{teamStats.totalAssistants}</p>
              <p className="text-sm text-muted-foreground">TeamMembers</p>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <p className="text-2xl font-bold text-success">{teamStats.availableAssistants}</p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
            <div className="text-center p-4 bg-warning/10 rounded-lg">
              <p className="text-2xl font-bold text-warning">{teamStats.pendingVerifications}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary">{teamStats.totalExecutives}</p>
              <p className="text-sm text-muted-foreground">Executives</p>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <SectionHeader title="Quick Actions" />
          <div className="space-y-2 mt-4">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => setInviteOpen(true)}>
              <Mail className="w-4 h-4" />
              Invite Team Member
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <Link to="/team-management"><Users className="w-4 h-4" />Manage Team</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <Link to="/company-profile"><User className="w-4 h-4" />Company Settings</Link>
            </Button>
          </div>
        </ContentCard>
      </div>

      {/* Pending Verifications */}
      {teamStats.pendingVerifications > 0 && (
        <ContentCard className="mb-8">
          <SectionHeader
            title="Pending Verifications"
            actions={
              <Badge variant="outline" className="bg-warning/10 text-warning">
                {pendingAssistants.length} waiting
              </Badge>
            }
          />
          {teamLoading ? (
            <LoadingState message="Loading verifications..." />
          ) : (
            <div className="space-y-3 mt-4">
              {pendingAssistants.map((team_member) => (
                <div
                  key={team_member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{team_member.firstName} {team_member.lastName}</p>
                      <p className="text-sm text-muted-foreground">{team_member.email}</p>
                      <div className="flex gap-2 mt-1">
                        {team_member.specialization && (
                          <Badge variant="outline" className="text-xs">{team_member.specialization}</Badge>
                        )}
                        {team_member.experience && (
                          <Badge variant="outline" className="text-xs">{team_member.experience} yrs exp</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleVerifyAssistant(team_member.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRejectAssistant(team_member.id)}>
                      Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRejectAssistant(team_member.id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {/* Company Code */}
      {/* <ContentCard className="mb-8 bg-primary/5 border-primary/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold mb-1">Your Company Code</h3>
            <p className="text-sm text-muted-foreground mb-3">Share this code with team members to join your workspace</p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 inline-block">
              <code className="text-xl font-mono font-bold text-primary">{activeWorkspace?.company?.companyCode || "Loading..."}</code>
            </div>
          </div>
          <Button variant="outline" className="gap-2"><Mail className="w-4 h-4" />Share Code</Button>
        </div>
      </ContentCard> */}

      {/* Tasks Section */}
      <SectionHeader
        title={workspaceRole === "member" ? "My Tasks" : "Recent Tasks"}
        description={totalItems > 0 ? `${totalItems} ${workspaceRole === "member" ? "assigned tasks" : "total tasks"}` : undefined}
        actions={
          workspaceRole === "member" ? undefined : (
            <Button onClick={() => setCreateTaskOpen(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />New Task
            </Button>
          )
        }
      />

      <div className="mb-4">
        <TaskFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} />
      </div>

      {filteredTasks.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={ClipboardList}
            title="No tasks found"
            description="Create your first task to get started with delegation"
            action={<Button onClick={() => setCreateTaskOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Task</Button>}
          />
        </ContentCard>
      ) : (
        <>
          <TaskTable
            tasks={currentTasks}
            showAssignee={workspaceRole !== "member"}
            showExecutive={true}
            showActions={workspaceRole !== "member"}
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

      {/* Dialogs */}
      <CreateTaskDialog open={createTaskOpen} onOpenChange={setCreateTaskOpen} onSuccess={handleTaskCreated} />
      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onSuccess={fetchDashboard} />
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
