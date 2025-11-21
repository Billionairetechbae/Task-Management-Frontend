// src/pages/DashboardManager.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  HelpCircle,
  User,
  Users,
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { api, Assistant, Task } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { useToast } from "@/hooks/use-toast";

const DashboardManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  const [stats, setStats] = useState({
    totalTasks: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    urgent: 0,
    completionRate: 0,
    totalAssistants: 0,
    verifiedAssistants: 0,
  });

  /* ---------------------------------------------
   * Filtered tasks for status tab
   * --------------------------------------------*/
  const filteredTasks = statusFilter
    ? tasks.filter((t) => t.status === statusFilter)
    : tasks;

  /* ---------------------------------------------
   * Load dashboard (tasks + assistants)
   * --------------------------------------------*/
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const tasksRes = await api.getTasks();
      const assistantsRes = await api.getCompanyAssistants();

      const assistantList = assistantsRes.data.assistants.filter(
        (a) => a.role === "assistant"
      );

      setTasks(tasksRes.data.tasks);
      setAssistants(assistantList);

      const completed = tasksRes.data.tasks.filter(
        (t) => t.status === "completed"
      ).length;
      const total = tasksRes.data.tasks.length;
      const pending = tasksRes.data.tasks.filter(
        (t) => t.status === "pending"
      ).length;
      const inProgress = tasksRes.data.tasks.filter(
        (t) => t.status === "in_progress"
      ).length;
      const overdue = tasksRes.data.tasks.filter(
        (t) =>
          new Date(t.deadline) < new Date() && t.status !== "completed"
      ).length;
      const urgent = tasksRes.data.tasks.filter(
        (t) => t.priority === "high"
      ).length;

      setStats({
        totalTasks: total,
        pending,
        inProgress,
        completed,
        overdue,
        urgent,
        completionRate:
          total > 0 ? Math.round((completed / total) * 100) : 0,
        totalAssistants: assistantList.length,
        verifiedAssistants: assistantList.filter((a) => a.isVerified)
          .length,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------
   * Helpers
   * --------------------------------------------*/
  const getStatusDisplay = (status: string) => {
    const map: Record<string, string> = {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return map[status] || status;
  };

  const getPriorityDisplay = (priority: string) =>
    priority.charAt(0).toUpperCase() + priority.slice(1);

  const getPriorityBadge = (priority: string) => (
    <Badge
      className={
        priority === "high"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : priority === "medium"
          ? "bg-warning/10 text-warning border-warning/20"
          : "bg-blue-100 text-blue-800"
      }
    >
      {getPriorityDisplay(priority)}
    </Badge>
  );

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
            {/* NEW BUTTON — Team Directory */}
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/team-directory">
                <Users className="w-4 h-4" />
                Team Directory
              </Link>
            </Button>

            <HelpCircle className="w-6 h-6 text-muted-foreground" />
            <Bell className="w-6 h-6 text-muted-foreground" />

            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" /> Profile
              </Link>
            </Button>

            <Button className="gap-2" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="w-5 h-5" /> Delegate Task
            </Button>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="px-6 py-8">
        {/* WELCOME */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Manager Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your team and delegate tasks.
          </p>
        </div>

        {/* TEAM OVERVIEW SECTION */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Team Overview</h3>

          {/* NEW: View All Team Members */}
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/team-directory">
              <Users className="w-4 h-4" /> View Team Members
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <MetricCard label="Assistants" value={stats.totalAssistants} icon={<Users />} />
          <MetricCard
            label="Verified Assistants"
            value={stats.verifiedAssistants}
            color="text-success"
            icon={<CheckCircle2 />}
          />
          <MetricCard
            label="Active Tasks"
            value={stats.inProgress}
            color="text-primary"
            icon={<Clock />}
          />
        </div>

        {/* TASK OVERVIEW */}
        <h3 className="text-xl font-bold mb-4">Task Overview</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard label="Total Tasks" value={stats.totalTasks} icon={<ClipboardList />} />
          <MetricCard
            label="Completion Rate"
            value={`${stats.completionRate}%`}
            icon={<TrendingUp />}
            color="text-success"
          />
          <MetricCard label="In Progress" value={stats.inProgress} icon={<Clock />} />
          <MetricCard
            label="Overdue"
            value={stats.overdue}
            icon={<AlertTriangle />}
            color="text-destructive"
          />
        </div>

        {/* TASK FILTER TABS */}
        <div className="mb-6 flex gap-2 border-b border-border">
          {["", "pending", "in_progress", "completed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 font-semibold ${
                statusFilter === s
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "" ? "All Tasks" : getStatusDisplay(s)}
            </button>
          ))}
        </div>

        {/* TASK TABLE */}
        {loading ? (
          <div className="bg-card p-6 rounded-xl border text-center">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState onCreate={() => setCreateTaskOpen(true)} />
        ) : (
          <TaskTable tasks={filteredTasks} getPriorityBadge={getPriorityBadge} />
        )}
      </main>

      {/* CREATE TASK MODAL */}
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onSuccess={loadDashboard}
      />
    </div>
  );
};

/* ========================== COMPONENTS ========================== */

const MetricCard = ({
  label,
  value,
  icon,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="bg-card border border-border rounded-2xl p-6">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="w-5 h-5 text-muted-foreground">{icon}</div>
    </div>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const TaskTable = ({ tasks, getPriorityBadge }: any) => (
  <div className="bg-card border rounded-xl overflow-hidden">
    <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b font-semibold text-sm">
      <div>Title</div>
      <div>Assignee</div>
      <div>Priority</div>
      <div>Deadline</div>
      <div>Status</div>
    </div>

    {tasks.map((task: Task) => (
      <div
        key={task.id}
        className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b items-center hover:bg-muted/50"
      >
        <div className="font-medium">{task.title}</div>
        <div className="text-muted-foreground">
          {task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : "Unassigned"}
        </div>
        <div>{getPriorityBadge(task.priority)}</div>
        <div className="text-muted-foreground">
          {new Date(task.deadline).toLocaleDateString()}
        </div>
        <div>
          <Badge className="capitalize">
            {task.status.replace("_", " ")}
          </Badge>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="bg-card border p-12 rounded-xl text-center max-w-lg mx-auto">
    <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
    <h3 className="text-xl font-semibold mb-2">No tasks available</h3>
    <p className="text-muted-foreground mb-6">
      Start by delegating a new task to your team.
    </p>
    <Button onClick={onCreate}>Create Task</Button>
  </div>
);

export default DashboardManager;
