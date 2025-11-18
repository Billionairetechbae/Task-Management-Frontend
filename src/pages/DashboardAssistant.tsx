import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, HelpCircle, User, CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { api, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const DashboardAssistant = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalAssigned: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0,
      completionRate: 0,
      totalHours: 0,
      averageHours: 0,
      onTimeCompletionRate: 0
    },
    analytics: {
      tasksByPriority: {} as Record<string, number>,
      timeframe: 'month'
    },
    activity: {
      recentCompleted: [] as Array<{
        id: string;
        title: string;
        completedAt: string;
        executive: {
          firstName: string;
          lastName: string;
        };
        actualHours: number;
      }>,
      upcomingDeadlines: [] as Array<{
        id: string;
        title: string;
        deadline: string;
        priority: string;
        executive: {
          firstName: string;
          lastName: string;
        };
      }>
    },
    currentTasks: {
      inProgress: 0,
      pending: 0
    }
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { toast } = useToast();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.getAssistantDashboard();
      
      // Set the dashboard data from the API structure
      setDashboardData(response.data);
      
      // For now, we'll fetch tasks separately since they're not in the dashboard response
      // You might want to add tasks to the dashboard API later
      try {
        const tasksResponse = await api.getTasks();
        setTasks(tasksResponse.data.tasks);
      } catch (taskError) {
        console.log('No tasks found or error fetching tasks:', taskError);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: "bg-blue-100 text-blue-800 border-blue-200",
      medium: "bg-warning/10 text-warning border-warning/20",
      high: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return colorMap[priority] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Calculate estimated earnings based on completed tasks and hourly rate
  const estimatedEarnings = user?.hourlyRate ? 
    (user.hourlyRate * dashboardData.overview.totalHours).toFixed(0) : '0';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-4">
            <button className="relative">
              <HelpCircle className="w-6 h-6 text-muted-foreground" />
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-muted-foreground" />
              {dashboardData.overview.overdue > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" />
                Profile
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome, {user?.firstName}!
              </h2>
              <p className="text-muted-foreground">
                {user?.isVerified 
                  ? "Here are your assigned tasks and performance metrics"
                  : "Your account is pending verification. You'll get access to tasks once verified."
                }
              </p>
            </div>
            {!user?.isVerified && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                <Clock className="w-3 h-3 mr-1" />
                Pending Verification
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Assigned</h3>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{dashboardData.overview.totalAssigned}</p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Completion Rate</h3>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <p className="text-3xl font-bold text-success">{dashboardData.overview.completionRate}%</p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Overdue Tasks</h3>
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-3xl font-bold text-destructive">{dashboardData.overview.overdue}</p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Earnings</h3>
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <p className="text-3xl font-bold">${estimatedEarnings}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {dashboardData.overview.totalHours} hours worked
            </p>
          </div>
        </div>

        {/* Current Tasks Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Current Tasks</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">In Progress</span>
                <Badge variant="secondary">{dashboardData.currentTasks.inProgress}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending</span>
                <Badge variant="outline">{dashboardData.currentTasks.pending}</Badge>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">On-Time Completion</span>
                <Badge variant="secondary">{dashboardData.overview.onTimeCompletionRate}%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Hours per Task</span>
                <Badge variant="outline">{dashboardData.overview.averageHours}h</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Upcoming Deadlines */}
        {(dashboardData.activity.recentCompleted.length > 0 || dashboardData.activity.upcomingDeadlines.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Recent Completed Tasks */}
            {dashboardData.activity.recentCompleted.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recently Completed</h3>
                <div className="space-y-3">
                  {dashboardData.activity.recentCompleted.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.executive.firstName} {task.executive.lastName}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-success">
                        {task.actualHours}h
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {dashboardData.activity.upcomingDeadlines.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Upcoming Deadlines</h3>
                <div className="space-y-3">
                  {dashboardData.activity.upcomingDeadlines.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {new Date(task.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {getPriorityDisplay(task.priority)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks List Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Your Tasks</h3>
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
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No tasks assigned yet</h3>
              <p className="text-muted-foreground mb-4">
                {user?.isVerified 
                  ? "You'll see tasks here once they're assigned to you by executives."
                  : "Complete your verification to start receiving tasks from executives."
                }
              </p>
              {!user?.isVerified && (
                <Button variant="outline" asChild>
                  <Link to="/profile">Complete Profile</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border font-semibold text-sm">
              <div>Task Title</div>
              <div>Client</div>
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
                  {task.executive ? `${task.executive.firstName} ${task.executive.lastName}` : 'Unknown'}
                </div>
                <div>
                  <Badge className={getPriorityColor(task.priority)}>
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
      </main>
    </div>
  );
};

export default DashboardAssistant;