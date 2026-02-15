import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
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
import { api, TeamMember, Task } from "@/lib/api";
import { Button } from "@/components/ui/button";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { useToast } from "@/hooks/use-toast";

const DashboardManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [team_members, setAssistants] = useState<TeamMember[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState("details");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const filteredTasks = statusFilter
    ? tasks.filter((t) => t.status === statusFilter)
    : tasks;

  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const tasksRes = await api.getTasks();
      const assistantsRes = await api.getCompanyAssistants();

      const assistantList = assistantsRes.data.team_members.filter(
        (a) => a.role === "team_member"
      );

      setTasks(tasksRes.data.tasks);
      setAssistants(assistantList);

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
        totalAssistants: assistantList.length,
        verifiedAssistants: assistantList.filter((a) => a.isVerified).length,
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

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleTaskCreated = () => {
    loadDashboard();
    setCreateTaskOpen(false);
    setCurrentPage(1);
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
        title="Manager Dashboard"
        description="Manage your team and delegate tasks"
        actions={
          <Button onClick={() => setCreateTaskOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Delegate Task</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {/* Team Overview */}
      <SectionHeader
        title="Team Overview"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/team-directory" className="gap-2">
              <Users className="w-4 h-4" />
              View Team
            </Link>
          </Button>
        }
        className="mb-4"
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="TeamMembers"
          value={stats.totalAssistants}
          icon={Users}
          iconClassName="bg-primary/10"
        />
        <StatsCard
          title="Verified TeamMembers"
          value={stats.verifiedAssistants}
          icon={CheckCircle2}
          iconClassName="bg-success/10"
        />
        <StatsCard
          title="Active Tasks"
          value={stats.inProgress}
          icon={Clock}
          iconClassName="bg-info/10"
        />
      </div>

      {/* Task Overview */}
      <SectionHeader title="Task Overview" className="mb-4" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Tasks" value={stats.totalTasks} icon={ClipboardList} iconClassName="bg-primary/10" />
        <StatsCard title="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} iconClassName="bg-success/10" />
        <StatsCard title="In Progress" value={stats.inProgress} icon={Clock} iconClassName="bg-info/10" />
        <StatsCard title="Overdue" value={stats.overdue} icon={AlertTriangle} iconClassName="bg-destructive/10" />
      </div>

      {/* Tasks Section */}
      <SectionHeader
        title="Tasks"
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
            title="No tasks available"
            description="Start by delegating a new task to your team"
            action={<Button onClick={() => setCreateTaskOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Task</Button>}
          />
        </ContentCard>
      ) : (
        <>
          <TaskTable
            tasks={currentTasks}
            showAssignee
            showActions
            onEdit={(task) => openDrawer(task, "details")}
            onAssign={(task) => openDrawer(task, "assignees")}
            onDelete={(task) => openDrawer(task, "danger")}
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

export default DashboardManager;
