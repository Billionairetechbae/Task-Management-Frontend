import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Bot, Crown, HelpCircle, Plus, User, X, Users, Clock, CheckCircle2, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, Task, Assistant } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import Logo from "@/components/Logo";

const DashboardExecutive = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'team'>('tasks');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.getExecutiveDashboard();
      
      // Destructure with default values
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
          }
        },
        recentActivity = { tasks: [] }
      } = response.data || {};

      const { team: teamStats, tasks: taskStats } = overview;
      
      setTasks(recentActivity.tasks || []);
      setTaskStats({
        totalTasks: taskStats.totalTasks || 0,
        pendingTasks: taskStats.pendingTasks || 0,
        inProgressTasks: taskStats.inProgressTasks || 0,
        completedTasks: taskStats.completedTasks || 0,
        overdueTasks: taskStats.overdueTasks || 0,
        urgentTasks: taskStats.urgentTasks || 0,
        completionRate: taskStats.completionRate || 0,
      });
      setTeamStats({
        totalAssistants: teamStats.totalAssistants || 0,
        availableAssistants: teamStats.availableAssistants || 0,
        pendingVerifications: teamStats.pendingVerifications || 0,
        totalExecutives: teamStats.totalExecutives || 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load dashboard data",
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
      console.error('Failed to fetch pending assistants:', error);
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
    if (activeTab === 'team') {
      fetchPendingAssistants();
    }
  }, [activeTab]);

  const handleTaskCreated = () => {
    fetchDashboard();
    setCreateTaskOpen(false);
  };

  const handleVerifyAssistant = async (assistantId: string) => {
    try {
      await api.verifyAssistant(assistantId);
      toast({
        title: "Assistant verified!",
        description: "The assistant has been approved and can now receive tasks",
      });
      fetchPendingAssistants();
      fetchDashboard(); // Refresh team stats
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
      fetchDashboard(); // Refresh team stats
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleInviteAssistant = async (email: string, firstName?: string, lastName?: string) => {
    try {
      await api.inviteAssistant({ email, firstName, lastName });
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Invitation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const filteredTasks = statusFilter
    ? tasks.filter(task => task.status === statusFilter)
    : tasks;

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  };

  const getPriorityDisplay = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const TeamManagementSection = () => (
    <div className="space-y-6">
      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Assistants</h3>
          <p className="text-3xl font-bold">{teamStats.totalAssistants}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Available Now</h3>
          <p className="text-3xl font-bold text-success">{teamStats.availableAssistants}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending Verification</h3>
          <p className="text-3xl font-bold text-warning">{teamStats.pendingVerifications}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Team Executives</h3>
          <p className="text-3xl font-bold text-primary">{teamStats.totalExecutives}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <Button onClick={() => {/* Open invite dialog */}} className="gap-2">
            <Mail className="w-4 h-4" />
            Invite Assistant
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start gap-3 h-auto py-4" asChild>
            <Link to="/team-management">
              <Users className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Manage Team</div>
                <div className="text-sm text-muted-foreground">View all assistants</div>
              </div>
            </Link>
          </Button>
          <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => setCreateTaskOpen(true)}>
            <Plus className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">Delegate Task</div>
              <div className="text-sm text-muted-foreground">Assign to assistant</div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start gap-3 h-auto py-4" asChild>
            <Link to="/company-profile">
              <User className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Company Settings</div>
                <div className="text-sm text-muted-foreground">Manage company info</div>
              </div>
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Verifications */}
      {teamStats.pendingVerifications > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pending Verifications</h3>
            <Badge variant="outline" className="text-warning">
              {pendingAssistants.length} waiting
            </Badge>
          </div>
          
          {teamLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading pending verifications...</p>
            </div>
          ) : pendingAssistants.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
              <p className="text-muted-foreground">No pending verifications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAssistants.map((assistant) => (
                <div key={assistant.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{assistant.firstName} {assistant.lastName}</h4>
                      <p className="text-sm text-muted-foreground">{assistant.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{assistant.specialization}</Badge>
                        <Badge variant="outline">{assistant.experience} years exp</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleVerifyAssistant(assistant.id)}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleRejectAssistant(assistant.id)}
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

      {/* Company Code Display */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Your Company Code</h3>
            <p className="text-muted-foreground mb-4">
              Share this code with assistants so they can join your company
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 inline-block">
              <code className="text-2xl font-mono font-bold text-primary">
                {user?.company?.companyCode || 'Loading...'}
              </code>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Mail className="w-4 h-4" />
            Share Code
          </Button>
        </div>
      </div>
    </div>
  );

  const TasksSection = () => (
    <div className="space-y-6">
      {/* Task Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Tasks</h3>
          <p className="text-3xl font-bold">{taskStats.totalTasks}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Completion Rate</h3>
          <p className="text-3xl font-bold text-success">{taskStats.completionRate}%</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-primary">{taskStats.inProgressTasks}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Overdue</h3>
          <p className="text-3xl font-bold text-destructive">{taskStats.overdueTasks}</p>
        </div>
      </div>

      {/* Task Filters */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 font-semibold ${!statusFilter ? 'border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 ${statusFilter === 'pending' ? 'font-semibold border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-4 py-2 ${statusFilter === 'in_progress' ? 'font-semibold border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-2 ${statusFilter === 'completed' ? 'font-semibold border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-6">Get started by delegating your first task to your team</p>
            <Button onClick={() => setCreateTaskOpen(true)} className="gap-2">
              <Plus className="w-5 h-5" />
              Delegate New Task
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border font-semibold text-sm">
            <div>Task Title</div>
            <div>Assignee</div>
            <div>Priority</div>
            <div>Deadline</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border last:border-0 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium">{task.title}</div>
              <div className="text-muted-foreground">
                {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
              </div>
              <div>
                <Badge
                  variant={task.priority === "high" ? "destructive" : "secondary"}
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-4">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/ai-hub">
                <Bot className="w-5 h-5" />
                AI Hub
              </Link>
            </Button>
            <button className="relative">
              <HelpCircle className="w-6 h-6 text-muted-foreground" />
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-muted-foreground" />
              {teamStats.pendingVerifications > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" />
                Profile
              </Link>
            </Button>
            <Button className="gap-2" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="w-5 h-5" />
              Delegate New Task
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        {showBanner && (
          <div className="bg-primary rounded-2xl p-6 mb-8 relative">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-4 right-4 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-primary-foreground font-bold text-xl mb-2">
                  Build Your Assistant Team
                </h3>
                <p className="text-primary-foreground/90 mb-4">
                  You have {teamStats.pendingVerifications} assistant{teamStats.pendingVerifications !== 1 ? 's' : ''} waiting for verification. 
                  Review and approve them to grow your team.
                </p>
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  onClick={() => setActiveTab('team')}
                >
                  Manage Team
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">
            {activeTab === 'tasks' ? 'Manage and track all delegated tasks' : 'Manage your company team and assistants'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 font-semibold ${activeTab === 'tasks' ? 'border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Tasks
              {taskStats.totalTasks > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {taskStats.totalTasks}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 font-semibold ${activeTab === 'team' ? 'border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
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

        {/* Content based on active tab */}
        {activeTab === 'tasks' ? <TasksSection /> : <TeamManagementSection />}
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