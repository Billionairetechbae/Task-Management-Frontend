import { useEffect, useRef, useState } from "react";
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
import { api, teamMemberRows, Task } from "@/lib/api";
import { filterTopLevelTasks } from "@/lib/taskListUtils";
import { Button } from "@/components/ui/button";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";

const DashboardManager = () => {
  const { user, activeCompanyId } = useAuth();
  const { toast } = useToast();
  const { canPerformRoleOperation } = useWorkspaceSettings();

  const [loading, setLoading] = useState(true);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  // null = the source failed (shown as unavailable); a number is a real, possibly zero, count.
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const loadSequence = useRef(0);
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
  const EMPTY_STATS = {
    totalTasks: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, urgent: 0, completionRate: 0, totalAssistants: 0, verifiedAssistants: 0,
  };
  const canCreateTask = canPerformRoleOperation("create_tasks", "manager");
  const hasTaskViewFilter = !canPerformRoleOperation("view_all_tasks", "manager");

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

  // Tasks and team members are independent sources: one failing must neither erase nor fake the other's numbers.
  // The sequence guard drops responses that arrive after the workspace changed or a newer load started.
  const loadDashboard = async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    const [tasksResult, membersResult] = await Promise.allSettled([api.getTasks(), api.getCompanyAssistants()]);
    if (sequence !== loadSequence.current) return;

    let topTasks: Task[] = [];
    let taskError: string | null = null;
    if (tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value?.data?.tasks)) {
      topTasks = filterTopLevelTasks(tasksResult.value.data.tasks);
    } else {
      taskError = tasksResult.status === "rejected" ? (tasksResult.reason?.message || "Tasks could not be loaded.") : "Tasks could not be loaded.";
    }

    let memberRows: Array<{ isVerified?: boolean }> | null = null;
    let memberError: string | null = null;
    if (membersResult.status === "fulfilled") {
      try { memberRows = teamMemberRows(membersResult.value); }
      catch (err: any) { memberError = err.message || "Team member data was unavailable."; }
    } else {
      memberError = membersResult.reason?.message || "Team member data was unavailable.";
    }

    const completed = topTasks.filter((t) => t.status === "completed").length;
    const total = topTasks.length;
    setTasks(topTasks);
    setTasksError(taskError);
    setMembersError(memberError);
    setStats({
      totalTasks: total,
      pending: topTasks.filter((t) => t.status === "pending").length,
      inProgress: topTasks.filter((t) => t.status === "in_progress").length,
      completed,
      overdue: topTasks.filter((t) => new Date(t.deadline) < new Date() && t.status !== "completed").length,
      urgent: topTasks.filter((t) => t.priority === "high").length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalAssistants: memberRows ? memberRows.length : 0,
      verifiedAssistants: memberRows ? memberRows.filter((a) => a.isVerified).length : 0,
    });
    if (taskError || memberError) {
      toast({ title: "Error", description: taskError || memberError || "Failed to load dashboard", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    // Never show another workspace's numbers while this one loads.
    setTasks([]);
    setStats(EMPTY_STATS);
    setTasksError(null);
    setMembersError(null);
    void loadDashboard();
    return () => { loadSequence.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

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
          <Button onClick={() => setCreateTaskOpen(true)} className="gap-2" disabled={!canCreateTask}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Delegate Task</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {(tasksError || membersError) && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span>
            {tasksError && membersError ? "Tasks and team member data could not be loaded." : tasksError ? "Task data could not be loaded." : "Team member data was unavailable."} The figures marked “—” are not zero; they could not be loaded.
          </span>
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>Retry</Button>
        </div>
      )}

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
          value={membersError ? "—" : stats.totalAssistants}
          description={membersError ? "Unavailable" : undefined}
          icon={Users}
          iconClassName="bg-primary/10"
        />
        <StatsCard
          title="Verified TeamMembers"
          value={membersError ? "—" : stats.verifiedAssistants}
          description={membersError ? "Unavailable" : undefined}
          icon={CheckCircle2}
          iconClassName="bg-success/10"
        />
        <StatsCard
          title="Active Tasks"
          value={tasksError ? "—" : stats.inProgress}
          description={tasksError ? "Unavailable" : undefined}
          icon={Clock}
          iconClassName="bg-info/10"
        />
      </div>

      {/* Task Overview */}
      <SectionHeader title="Task Overview" className="mb-4" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Tasks" value={tasksError ? "—" : stats.totalTasks} icon={ClipboardList} iconClassName="bg-primary/10" />
        <StatsCard title="Completion Rate" value={tasksError ? "—" : `${stats.completionRate}%`} icon={TrendingUp} iconClassName="bg-success/10" />
        <StatsCard title="In Progress" value={tasksError ? "—" : stats.inProgress} icon={Clock} iconClassName="bg-info/10" />
        <StatsCard title="Overdue" value={tasksError ? "—" : stats.overdue} icon={AlertTriangle} iconClassName="bg-destructive/10" />
      </div>

      {/* Tasks Section */}
      <SectionHeader
        title="Tasks"
        description={totalItems > 0 ? `${totalItems} total tasks` : undefined}
        actions={
          <Button onClick={() => setCreateTaskOpen(true)} size="sm" className="gap-2" disabled={!canCreateTask}>
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        }
      />

      <div className="mb-4">
        <TaskFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} />
      </div>
      {hasTaskViewFilter && (
        <p className="text-xs text-muted-foreground mb-4">
          You're viewing tasks created by or assigned to you based on workspace policy.
        </p>
      )}

      {tasksError ? null : filteredTasks.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={ClipboardList}
            title="No tasks available"
            description="Start by delegating a new task to your team"
            action={<Button onClick={() => setCreateTaskOpen(true)} disabled={!canCreateTask}><Plus className="w-4 h-4 mr-2" />Create Task</Button>}
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
