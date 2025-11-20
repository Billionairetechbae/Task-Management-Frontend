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
  Mail,
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
  const [pendingAssistants, setPendingAssistants] = useState<Assistant[]>([]);
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
    pendingVerifications: 0,
  });

  const filteredTasks = statusFilter
    ? tasks.filter((t) => t.status === statusFilter)
    : tasks;

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Managers use the same tasks endpoint as executives
      const tasksRes = await api.getTasks();
      const assistantsRes = await api.getCompanyAssistants();
      const pendingRes = await api.getPendingVerifications();

      setTasks(tasksRes.data.tasks);
      setAssistants(assistantsRes.data.assistants);
      setPendingAssistants(pendingRes.data.pendingAssistants);

      const completed = tasksRes.data.tasks.filter((t) => t.status === "completed").length;
      const total = tasksRes.data.tasks.length;
      const pending = tasksRes.data.tasks.filter((t) => t.status === "pending").length;
      const inProgress = tasksRes.data.tasks.filter((t) => t.status === "in_progress").length;
      const overdue = tasksRes.data.tasks.filter(
        (t) => new Date(t.deadline) < new Date() && t.status !== "completed"
      ).length;
      const urgent = tasksRes.data.tasks.filter((t) => t.priority === "high").length;

      setStats({
        totalTasks: total,
        pending,
        inProgress,
        completed,
        overdue,
        urgent,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalAssistants: assistantsRes.data.assistants.length,
        verifiedAssistants: assistantsRes.data.assistants.filter((a) => a.isVerified).length,
        pendingVerifications: pendingRes.data.pendingAssistants.length,
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

  const handleVerifyAssistant = async (assistantId: string) => {
    try {
      await api.verifyAssistant(assistantId);
      toast({ title: "Assistant verified!" });
      loadDashboard();
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectAssistant = async (assistantId: string) => {
    try {
      await api.rejectAssistant(assistantId);
      toast({ title: "Assistant rejected" });
      loadDashboard();
    } catch (err: any) {
      toast({
        title: "Rejection failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusDisplay = (status: string) => {
    const map: Record<string, string> = {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return map[status] || status;
  };

  const getPriorityDisplay = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getPriorityBadge = (priority: string) => {
    return (
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-4">
            <HelpCircle className="w-6 h-6 text-muted-foreground" />
            <Bell className="w-6 h-6 text-muted-foreground" />
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" />
                Profile
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
          <h2 className="text-3xl font-bold mb-2">
            Welcome, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">
            Manage your company’s tasks and team.
          </p>
        </div>

        {/* METRICS GRID */}
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
            label="Overdue Tasks"
            value={stats.overdue}
            icon={<AlertTriangle />}
            color="text-destructive"
          />
        </div>

        {/* TASK TABS */}
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

        {/* TEAM MANAGEMENT SECTION */}
        <h3 className="text-xl font-semibold mt-12 mb-4">Team Overview</h3>

        <TeamStats stats={stats} />

        {/* PENDING ASSISTANT APPROVALS */}
        {stats.pendingVerifications > 0 && (
          <PendingApprovals
            pendingAssistants={pendingAssistants}
            onApprove={handleVerifyAssistant}
            onReject={handleRejectAssistant}
          />
        )}
      </main>

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
    <div className="flex items-center justify-between mb-2">
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
          <Badge className="capitalize">{task.status.replace("_", " ")}</Badge>
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

const TeamStats = ({ stats }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <MetricCard label="Assistants" value={stats.totalAssistants} icon={<Users />} />
    <MetricCard
      label="Verified Assistants"
      value={stats.verifiedAssistants}
      color="text-success"
      icon={<CheckCircle2 />}
    />
    <MetricCard
      label="Pending Verification"
      value={stats.pendingVerifications}
      color="text-warning"
      icon={<Clock />}
    />
  </div>
);

const PendingApprovals = ({
  pendingAssistants,
  onApprove,
  onReject,
}: {
  pendingAssistants: Assistant[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => (
  <div className="bg-card border rounded-xl p-6 mt-8">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Pending Assistant Approvals</h3>
      <Badge>{pendingAssistants.length} pending</Badge>
    </div>

    {pendingAssistants.map((assistant) => (
      <div
        key={assistant.id}
        className="p-4 border rounded-lg flex items-center justify-between mb-3"
      >
        <div>
          <p className="font-semibold">
            {assistant.firstName} {assistant.lastName}
          </p>
          <p className="text-muted-foreground text-sm">{assistant.email}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onApprove(assistant.id)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(assistant.id)}>
            Reject
          </Button>
        </div>
      </div>
    ))}
  </div>
);

export default DashboardManager;
