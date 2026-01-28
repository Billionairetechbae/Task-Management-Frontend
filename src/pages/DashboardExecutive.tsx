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
  Calendar,
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

import { useAuth } from "@/contexts/AuthContext";
import { api, Task, Assistant } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import InviteUserDialog from "@/components/InviteUserDialog";

const DashboardExecutive = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);

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

  const [pendingAssistants, setPendingAssistants] = useState<Assistant[]>([]);

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
      console.error("Failed to fetch pending assistants:", error);
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
      toast({ title: "Assistant verified!", description: "The assistant can now receive tasks" });
      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectAssistant = async (assistantId: string) => {
    try {
      await api.rejectAssistant(assistantId);
      toast({ title: "Assistant rejected", description: "The registration has been removed" });
      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    }
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
        description="Manage your team and track task progress"
        actions={
          <div className="flex gap-3">
            <Button 
              asChild 
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
            >
              <Link to="/assistance-requests">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Request Assistance</span>
                <span className="sm:hidden">Help</span>
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setCreateTaskOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Delegate Task</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Tasks"
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
          title="In Progress"
          value={taskStats.inProgressTasks}
          icon={Clock}
          iconClassName="bg-info/10"
        />
        <StatsCard
          title="Overdue"
          value={taskStats.overdueTasks}
          icon={AlertTriangle}
          iconClassName="bg-destructive/10"
        />
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Team Stats */}
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
              <p className="text-sm text-muted-foreground">Assistants</p>
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

        {/* Quick Actions */}
        <ContentCard>
          <SectionHeader title="Quick Actions" />
          <div className="space-y-2 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setInviteOpen(true)}
            >
              <Mail className="w-4 h-4" />
              Invite Team Member
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <Link to="/team-management">
                <Users className="w-4 h-4" />
                Manage Team
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <Link to="/company-profile">
                <User className="w-4 h-4" />
                Company Settings
              </Link>
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
              {pendingAssistants.map((assistant) => (
                <div
                  key={assistant.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{assistant.firstName} {assistant.lastName}</p>
                      <p className="text-sm text-muted-foreground">{assistant.email}</p>
                      <div className="flex gap-2 mt-1">
                        {assistant.specialization && (
                          <Badge variant="outline" className="text-xs">{assistant.specialization}</Badge>
                        )}
                        {assistant.experience && (
                          <Badge variant="outline" className="text-xs">{assistant.experience} yrs exp</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleVerifyAssistant(assistant.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRejectAssistant(assistant.id)}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {/* Company Code */}
      <ContentCard className="mb-8 bg-primary/5 border-primary/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold mb-1">Your Company Code</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Share this code with team members to join your workspace
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 inline-block">
              <code className="text-xl font-mono font-bold text-primary">
                {user?.company?.companyCode || "Loading..."}
              </code>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Mail className="w-4 h-4" />
            Share Code
          </Button>
        </div>
      </ContentCard>

      {/* Tasks Section */}
      <SectionHeader
        title="Recent Tasks"
        description={totalItems > 0 ? `${totalItems} total tasks` : undefined}
        actions={
          <Button onClick={() => setCreateTaskOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
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
            action={
              <Button onClick={() => setCreateTaskOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            }
          />
        </ContentCard>
      ) : (
        <>
          <TaskTable tasks={currentTasks} showAssignee />
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
    </DashboardLayout>
  );
};

export default DashboardExecutive;
