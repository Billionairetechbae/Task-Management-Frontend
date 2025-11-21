// src/pages/DashboardAssistant.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  HelpCircle,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { api, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const DashboardAssistant = () => {
  const { user } = useAuth();
  const { toast } = useToast();

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
      onTimeCompletionRate: 0,
    },
    analytics: {
      tasksByPriority: {} as Record<string, number>,
      timeframe: "month",
    },
    activity: {
      recentCompleted: [] as Array<{
        id: string;
        title: string;
        completedAt: string;
        executive: { firstName: string; lastName: string };
        actualHours: number;
      }>,
      upcomingDeadlines: [] as Array<{
        id: string;
        title: string;
        deadline: string;
        priority: string;
        executive: { firstName: string; lastName: string };
      }>,
    },
    currentTasks: {
      inProgress: 0,
      pending: 0,
    },
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  /* ---------------------------------------------
   * Fetch Assistant Dashboard
   * --------------------------------------------*/
  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const response = await api.getAssistantDashboard();
      setDashboardData(response.data);

      try {
        const tasksResponse = await api.getTasks();
        setTasks(tasksResponse.data.tasks);
      } catch {
        /** assistants may not see all tasks */
      }
    } catch (error) {
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

  /* ---------------------------------------------
   * Helpers
   * --------------------------------------------*/
  const filteredTasks = statusFilter
    ? tasks.filter((task) => task.status === statusFilter)
    : tasks;

  const getStatusDisplay = (status: string) =>
    ({
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    }[status] || status);

  const getPriorityDisplay = (priority: string) =>
    priority.charAt(0).toUpperCase() + priority.slice(1);

  const getPriorityColor = (priority: string) =>
    ({
      low: "bg-blue-100 text-blue-800 border-blue-200",
      medium: "bg-warning/10 text-warning border-warning/20",
      high: "bg-destructive/10 text-destructive border-destructive/20",
    }[priority] || "bg-gray-100 text-gray-800 border-gray-200");

  const estimatedEarnings =
    user?.hourlyRate && dashboardData.overview.totalHours
      ? (user.hourlyRate * dashboardData.overview.totalHours).toFixed(0)
      : "0";

  /* ---------------------------------------------
   * Render
   * --------------------------------------------*/
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-4">
            {/* NEW: Team Directory Button */}
            <Button variant="outline" asChild className="gap-2">
              <Link to="/team-directory">
                <Users className="w-4 h-4" />
                Team Directory
              </Link>
            </Button>

            <HelpCircle className="w-6 h-6 text-muted-foreground" />

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

      {/* MAIN CONTENT */}
      <main className="px-6 py-8">
        {/* WELCOME */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-2">
            Welcome, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">
            {user?.isVerified
              ? "Here are your tasks and performance insights."
              : "Your account is pending verification. You’ll get tasks after approval."}
          </p>

          {!user?.isVerified && (
            <Badge variant="outline" className="mt-3 bg-warning/10 text-warning">
              <Clock className="w-3 h-3 mr-1" />
              Pending Verification
            </Badge>
          )}
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard
            label="Total Assigned"
            value={dashboardData.overview.totalAssigned}
            icon={<CheckCircle2 className="text-primary" />}
          />

          <StatCard
            label="Completion Rate"
            value={`${dashboardData.overview.completionRate}%`}
            icon={<TrendingUp className="text-success" />}
            color="text-success"
          />

          <StatCard
            label="Overdue"
            value={dashboardData.overview.overdue}
            icon={<AlertTriangle className="text-destructive" />}
            color="text-destructive"
          />

          <StatCard
            label="Total Earnings"
            value={`$${estimatedEarnings}`}
            icon={<CheckCircle2 className="text-accent" />}
          />
        </div>

        {/* CURRENT TASK METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <BoxCard title="Current Tasks">
            <KeyValue label="In Progress" value={dashboardData.currentTasks.inProgress} />
            <KeyValue label="Pending" value={dashboardData.currentTasks.pending} />
          </BoxCard>

          <BoxCard title="Performance">
            <KeyValue
              label="On-Time Completion"
              value={`${dashboardData.overview.onTimeCompletionRate}%`}
            />
            <KeyValue
              label="Avg. Hours / Task"
              value={`${dashboardData.overview.averageHours}h`}
            />
          </BoxCard>
        </div>

        {/* RECENT ACTIVITY */}
        {(dashboardData.activity.recentCompleted.length > 0 ||
          dashboardData.activity.upcomingDeadlines.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* RECENT COMPLETED */}
            {dashboardData.activity.recentCompleted.length > 0 && (
              <BoxCard title="Recently Completed">
                {dashboardData.activity.recentCompleted.slice(0, 3).map((task) => (
                  <ActivityCard
                    key={task.id}
                    title={task.title}
                    subtitle={`${task.executive.firstName} ${task.executive.lastName}`}
                    badge={task.actualHours + "h"}
                  />
                ))}
              </BoxCard>
            )}

            {/* UPCOMING DEADLINES */}
            {dashboardData.activity.upcomingDeadlines.length > 0 && (
              <BoxCard title="Upcoming Deadlines">
                {dashboardData.activity.upcomingDeadlines.slice(0, 3).map((task) => (
                  <ActivityCard
                    key={task.id}
                    title={task.title}
                    subtitle={`Due ${new Date(
                      task.deadline
                    ).toLocaleDateString()}`}
                    badge={getPriorityDisplay(task.priority)}
                    badgeClass={getPriorityColor(task.priority)}
                  />
                ))}
              </BoxCard>
            )}
          </div>
        )}

        {/* TASK LIST */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Your Tasks</h3>

          {/* FILTER TABS */}
          <div className="flex gap-2 border-b border-border">
            {["", "pending", "in_progress", "completed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 font-semibold ${
                  statusFilter === s
                    ? "border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "" ? "All Tasks" : getStatusDisplay(s)}
              </button>
            ))}
          </div>
        </div>

        {/* TASK RESULTS */}
        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">No tasks assigned yet</h3>
            <p className="text-muted-foreground">
              You’ll see tasks here when your executive assigns them.
            </p>
          </div>
        ) : (
          <TaskListTable
            tasks={filteredTasks}
            getStatusDisplay={getStatusDisplay}
            getPriorityDisplay={getPriorityDisplay}
            getPriorityColor={getPriorityColor}
          />
        )}
      </main>
    </div>
  );
};

/* ---------------------------------------------
 * Sub-Components
 * --------------------------------------------*/

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="bg-card border border-border rounded-2xl p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <span className="w-5 h-5 text-muted-foreground">{icon}</span>
    </div>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const BoxCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-2xl p-6">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const KeyValue = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-muted-foreground">{label}</span>
    <Badge variant="secondary">{value}</Badge>
  </div>
);

const ActivityCard = ({
  title,
  subtitle,
  badge,
  badgeClass,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeClass?: string;
}) => (
  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
    <div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <Badge className={badgeClass || "bg-accent/10 text-accent border-accent/20"}>
      {badge}
    </Badge>
  </div>
);

const TaskListTable = ({
  tasks,
  getStatusDisplay,
  getPriorityDisplay,
  getPriorityColor,
}: any) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
    <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b font-semibold text-sm">
      <div>Task Title</div>
      <div>Client</div>
      <div>Priority</div>
      <div>Deadline</div>
      <div>Status</div>
      <div>Actions</div>
    </div>

    {tasks.map((task: Task) => (
      <div
        key={task.id}
        className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b items-center hover:bg-muted/50"
      >
        <div className="font-medium">{task.title}</div>

        <div className="text-muted-foreground">
          {task.executive
            ? `${task.executive.firstName} ${task.executive.lastName}`
            : "Unknown"}
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
          <Badge>{getStatusDisplay(task.status)}</Badge>
        </div>

        <div>
          <Button variant="link" className="text-primary" asChild>
            <Link to={`/task-details/${task.id}`}>View Details</Link>
          </Button>
        </div>
      </div>
    ))}
  </div>
);

export default DashboardAssistant;
