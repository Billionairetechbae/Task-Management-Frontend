import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, HelpCircle, User, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { api, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const DashboardAssistant = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    urgentTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { toast } = useToast();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.getAssistantDashboard();
      setTasks(response.data.tasks);
      setStats(response.data.stats);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-bold text-2xl">
            admiino<span className="text-accent">°</span>
          </h1>

          <div className="flex items-center gap-4">
            <button className="relative">
              <HelpCircle className="w-6 h-6 text-muted-foreground" />
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">Here are your assigned tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Active Tasks</h3>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{stats.inProgressTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Completed Tasks</h3>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <p className="text-3xl font-bold">{stats.completedTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Estimated Earnings</h3>
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <p className="text-3xl font-bold">${user?.hourlyRate ? (user.hourlyRate * tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)).toFixed(0) : 0}</p>
          </div>
        </div>

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

        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">No tasks assigned yet</p>
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
      </main>
    </div>
  );
};

export default DashboardAssistant;
