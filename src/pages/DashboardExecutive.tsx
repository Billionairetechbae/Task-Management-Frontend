import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Bot, Crown, HelpCircle, Plus, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import CreateTaskDialog from "@/components/CreateTaskDialog";

const DashboardExecutive = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    urgentTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.getExecutiveDashboard();
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

  const handleTaskCreated = () => {
    fetchDashboard();
    setCreateTaskOpen(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-bold text-2xl">
            admiino<span className="text-accent">°</span>
          </h1>

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
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
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
                  Need more capacity?
                </h3>
                <p className="text-primary-foreground/90 mb-4">
                  Upgrade to Premium and hire a dedicated Chief of Staff to handle your tasks
                  professionally.
                </p>
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  asChild
                >
                  <Link to="/plans">Hire a Chief of Staff Now</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">Manage and track all delegated tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Tasks</h3>
            <p className="text-3xl font-bold">{stats.totalTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending</h3>
            <p className="text-3xl font-bold text-warning">{stats.pendingTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">In Progress</h3>
            <p className="text-3xl font-bold text-primary">{stats.inProgressTasks}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed</h3>
            <p className="text-3xl font-bold text-success">{stats.completedTasks}</p>
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
            <p className="text-muted-foreground">No tasks found</p>
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
