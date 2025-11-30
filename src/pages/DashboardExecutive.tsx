// src/pages/DashboardExecutive.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Bot,
  Crown,
  HelpCircle,
  Plus,
  User,
  X,
  Users,
  Clock,
  CheckCircle2,
  Mail,
  Menu,
} from "lucide-react";

import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { api, Task, Assistant } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import InviteUserDialog from "@/components/InviteUserDialog";

type TeamTab = "tasks" | "team";

const DashboardExecutive = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [showBanner, setShowBanner] = useState(true);
  const [activeTab, setActiveTab] = useState<TeamTab>("tasks");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [inviteOpen, setInviteOpen] = useState(false);

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
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  /* -----------------------------------
   * Helpers
   * ----------------------------------*/

  const filteredTasks = statusFilter
    ? tasks.filter((task) => task.status === statusFilter)
    : tasks;

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  };

  const getPriorityDisplay = (priority: string) =>
    priority.charAt(0).toUpperCase() + priority.slice(1);

  /* -----------------------------------
   * Data Fetchers
   * ----------------------------------*/

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
        description:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data",
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
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === "team") {
      fetchPendingAssistants();
    }
  }, [activeTab]);

  /* -----------------------------------
   * Actions
   * ----------------------------------*/

  const handleTaskCreated = () => {
    fetchDashboard();
    setCreateTaskOpen(false);
  };

  const handleVerifyAssistant = async (assistantId: string) => {
    try {
      await api.verifyAssistant(assistantId);
      toast({
        title: "Assistant verified!",
        description:
          "The assistant has been approved and can now receive tasks",
      });
      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRejectAssistant = async (assistantId: string) => {
    try {
      await api.rejectAssistant(assistantId);
      toast({
        title: "Assistant rejected",
        description: "The assistant registration has been removed",
      });
      fetchPendingAssistants();
      fetchDashboard();
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  /* -----------------------------------
   * Sections
   * ----------------------------------*/

  const TeamManagementSection = () => (
    <div className="space-y-6">
      {/* Team Overview Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <h2 className="text-xl font-semibold">Team Overview</h2>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" asChild>
          <Link to="/team-directory">
            <Users className="w-4 h-4" />
            View All Team Members
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            Total Assistants
          </h3>
          <p className="text-2xl sm:text-3xl font-bold">{teamStats.totalAssistants}</p>
        </div>
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            Available Now
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-success">
            {teamStats.availableAssistants}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            Pending Verification
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-warning">
            {teamStats.pendingVerifications}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            Team Executives
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-primary">
            {teamStats.totalExecutives}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => setInviteOpen(true)}
            >
              <Mail className="w-4 h-4" />
              Invite Team Member
            </Button>

            <Button variant="outline" className="gap-2 w-full sm:w-auto" asChild>
              <Link to="/team-directory">
                <Users className="w-4 h-4" />
                Team Directory
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3 sm:py-4"
            asChild
          >
            <Link to="/team-management">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="text-left">
                <div className="font-semibold text-sm sm:text-base">Manage Team</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  View all assistants & managers
                </div>
              </div>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3 sm:py-4"
            onClick={() => setCreateTaskOpen(true)}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <div className="text-left">
              <div className="font-semibold text-sm sm:text-base">Delegate Task</div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Assign work to your team
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3 sm:py-4"
            asChild
          >
            <Link to="/company-profile">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="text-left">
                <div className="font-semibold text-sm sm:text-base">Company Settings</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Manage company info
                </div>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Verifications */}
      {teamStats.pendingVerifications > 0 && (
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold">Pending Verifications</h3>
            <Badge variant="outline" className="text-warning w-fit">
              {pendingAssistants.length} waiting
            </Badge>
          </div>

          {teamLoading ? (
            <div className="text-center py-6 sm:py-8">
              <p className="text-muted-foreground">Loading pending verifications...</p>
            </div>
          ) : pendingAssistants.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <CheckCircle2 className="w-8 h-8 sm:w-12 sm:h-12 text-success mx-auto mb-3 sm:mb-4" />
              <p className="text-muted-foreground">No pending verifications</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {pendingAssistants.map((assistant) => (
                <div
                  key={assistant.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-border rounded-lg gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm sm:text-base truncate">
                        {assistant.firstName} {assistant.lastName}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {assistant.email}
                      </p>
                      <div className="flex gap-1 sm:gap-2 mt-1 flex-wrap">
                        {assistant.specialization && (
                          <Badge variant="outline" className="text-xs">
                            {assistant.specialization}
                          </Badge>
                        )}
                        {assistant.experience !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {assistant.experience} years exp
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => handleVerifyAssistant(assistant.id)}
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectAssistant(assistant.id)}
                      className="flex-1 sm:flex-none"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Company Code */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Your Company Code</h3>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">
              Share this code with executives, managers and team members so they
              can join your workspace.
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4 w-full lg:w-auto">
              <code className="text-xl sm:text-2xl font-mono font-bold text-primary break-all">
                {user?.company?.companyCode || "Loading..."}
              </code>
            </div>
          </div>
          <Button variant="outline" className="gap-2 w-full lg:w-auto mt-4 lg:mt-0">
            <Mail className="w-4 h-4" />
            Share Code
          </Button>
        </div>
      </div>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={fetchDashboard}
      />
    </div>
  );

  const TasksSection = () => (
    <div className="space-y-6">
      {/* Task Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            Total Tasks
          </h3>
          <p className="text-2xl sm:text-3xl font-bold">{taskStats.totalTasks}</p>
        </div>
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            Completion Rate
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-success">
            {taskStats.completionRate}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            In Progress
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-primary">
            {taskStats.inProgressTasks}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            Overdue
          </h3>
          <p className="text-2xl sm:text-3xl font-bold text-destructive">
            {taskStats.overdueTasks}
          </p>
        </div>
      </div>

      {/* Task Filters */}
      <div className="mb-6">
        <div className="flex gap-1 sm:gap-2 border-b border-border overflow-x-auto">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-2 text-sm sm:text-base font-semibold whitespace-nowrap ${
              !statusFilter
                ? "border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-2 text-sm sm:text-base whitespace-nowrap ${
              statusFilter === "pending"
                ? "font-semibold border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("in_progress")}
            className={`px-3 py-2 text-sm sm:text-base whitespace-nowrap ${
              statusFilter === "in_progress"
                ? "font-semibold border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-2 text-sm sm:text-base whitespace-nowrap ${
              statusFilter === "completed"
                ? "font-semibold border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
              Get started by delegating your first task to your team.
            </p>
            <Button
              onClick={() => setCreateTaskOpen(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Delegate New Task
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border font-semibold text-sm">
            <div>Task Title</div>
            <div>Assignee</div>
            <div>Priority</div>
            <div>Deadline</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm flex-1">{task.title}</h4>
                  <Badge
                    variant={task.status === "in_progress" ? "default" : "secondary"}
                    className={
                      task.status === "pending"
                        ? "bg-warning text-warning-foreground"
                        : task.status === "completed"
                        ? "bg-success text-success-foreground"
                        : ""
                    }
                  >
                    {getStatusDisplay(task.status)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Assignee:</span>
                    <div className="font-medium">
                      {task.assignee
                        ? `${task.assignee.firstName} ${task.assignee.lastName}`
                        : "Unassigned"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priority:</span>
                    <div>
                      <Badge
                        variant={
                          task.priority === "high" ? "destructive" : "secondary"
                        }
                        className={
                          task.priority === "medium"
                            ? "bg-warning/10 text-warning border-warning/20 text-xs"
                            : "text-xs"
                        }
                      >
                        {getPriorityDisplay(task.priority)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deadline:</span>
                    <div className="font-medium">
                      {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <Button variant="link" className="text-primary p-0 h-auto" asChild>
                  <Link to={`/task-details/${task.id}`}>View Details</Link>
                </Button>
              </div>
            ))}
          </div>

          {/* Desktop Rows */}
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border last:border-0 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium">{task.title}</div>
              <div className="text-muted-foreground">
                {task.assignee
                  ? `${task.assignee.firstName} ${task.assignee.lastName}`
                  : "Unassigned"}
              </div>
              <div>
                <Badge
                  variant={
                    task.priority === "high" ? "destructive" : "secondary"
                  }
                  className={
                    task.priority === "medium"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : ""
                  }
                >
                  {getPriorityDisplay(task.priority)}
                </Badge>
              </div>
              <div className="text-muted-foreground">
                {new Date(task.deadline).toLocaleDateString()}
              </div>
              <div>
                <Badge
                  variant={task.status === "in_progress" ? "default" : "secondary"}
                  className={
                    task.status === "pending"
                      ? "bg-warning text-warning-foreground"
                      : task.status === "completed"
                      ? "bg-success text-success-foreground"
                      : ""
                  }
                >
                  {getStatusDisplay(task.status)}
                </Badge>
              </div>
              <div>
                <Button variant="link" className="text-primary" asChild>
                  <Link to={`/task-details/${task.id}`}>View Details</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* -----------------------------------
   * Render
   * ----------------------------------*/

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Logo className="h-6 sm:h-8" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/ai-hub">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                AI Hub
              </Link>
            </Button>

            <Button variant="outline" className="gap-2" asChild>
              <Link to="/team-directory">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                Team Directory
              </Link>
            </Button>

            <button className="relative">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            </button>
            <button className="relative">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
              {teamStats.pendingVerifications > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Profile
              </Link>
            </Button>
            <Button className="gap-2" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Delegate New Task</span>
              <span className="sm:hidden">New Task</span>
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button className="relative p-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {teamStats.pendingVerifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/ai-hub" onClick={() => setMobileMenuOpen(false)}>
                <Bot className="w-4 h-4" />
                AI Hub
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/team-directory" onClick={() => setMobileMenuOpen(false)}>
                <Users className="w-4 h-4" />
                Team Directory
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                <User className="w-4 h-4" />
                Profile
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Banner */}
        {showBanner && (
          <div className="bg-primary rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 relative">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-accent rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-primary-foreground font-bold text-lg sm:text-xl mb-1 sm:mb-2">
                  Build Your Team
                </h3>
                <p className="text-primary-foreground/90 mb-3 sm:mb-4 text-sm sm:text-base">
                  You have {teamStats.pendingVerifications} member
                  {teamStats.pendingVerifications !== 1 ? "s" : ""} waiting for
                  verification. Review and approve them to grow your team.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                    onClick={() => {
                      setActiveTab("team");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Manage Team
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-primary/10 text-primary-foreground border-primary-foreground/40 gap-2"
                    asChild
                  >
                    <Link to="/team-directory" onClick={() => setMobileMenuOpen(false)}>
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      View Team
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {activeTab === "tasks"
              ? "Manage and track all delegated tasks."
              : "Manage your company team, verification and structure."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-1 sm:gap-2 border-b border-border overflow-x-auto">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-3 py-2 text-sm sm:text-base font-semibold whitespace-nowrap ${
                activeTab === "tasks"
                  ? "border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tasks
              {taskStats.totalTasks > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {taskStats.totalTasks}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("team")}
              className={`px-3 py-2 text-sm sm:text-base font-semibold whitespace-nowrap ${
                activeTab === "team"
                  ? "border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Team Management
              {teamStats.pendingVerifications > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {teamStats.pendingVerifications}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {activeTab === "tasks" ? <TasksSection /> : <TeamManagementSection />}
      </main>

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onSuccess={handleTaskCreated}
      />
    </div>
  );
};

export default DashboardExecutive;