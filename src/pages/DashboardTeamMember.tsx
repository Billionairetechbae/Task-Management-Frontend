import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
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
  getPriorityBadgeClass,
  getPriorityDisplay,
} from "@/components/dashboard/TaskComponents";
import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";

import { useAuth } from "@/contexts/AuthContext";
import { api, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const DashboardTeamMember = () => {
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
        creator?: { firstName: string; lastName: string } | null;
        actualHours: number;
      }>,
      upcomingDeadlines: [] as Array<{
        id: string;
        title: string;
        deadline: string;
        priority: string;
        creator?: { firstName: string; lastName: string } | null;
      }>,
    },
    currentTasks: {
      inProgress: 0,
      pending: 0,
    },
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  // Drawer state (assistant: update progress)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getTeamMemberDashboard();
      setDashboardData(res.data);

      try {
        const taskRes = await api.getTasks();
        setTasks(taskRes.data.tasks || []);
      } catch (_) {}
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getCreatorName = (task: any) => {
    if (task?.creator?.firstName && task?.creator?.lastName) {
      return `${task.creator.firstName} ${task.creator.lastName}`;
    }
    return "Executive";
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
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
        title={`Welcome, ${user?.firstName}!`}
        description={
          user?.isVerified
            ? "Here are your assigned tasks and performance insights"
            : "Your account is pending verification from your executive"
        }
      />

      {!user?.isVerified && (
        <div className="mb-6">
          <Badge variant="outline" className="bg-warning/10 text-warning gap-1">
            <Clock className="w-3 h-3" />
            Pending Verification
          </Badge>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Assigned" value={dashboardData.overview.totalAssigned} icon={ClipboardList} iconClassName="bg-primary/10" />
        <StatsCard title="Completion Rate" value={`${dashboardData.overview.completionRate}%`} icon={TrendingUp} iconClassName="bg-success/10" />
        <StatsCard title="In Progress" value={dashboardData.currentTasks.inProgress} icon={Clock} iconClassName="bg-info/10" />
        <StatsCard title="Overdue" value={dashboardData.overview.overdue} icon={AlertTriangle} iconClassName="bg-destructive/10" />
      </div>

      {/* Performance & Current Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ContentCard>
          <SectionHeader title="Current Tasks" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-4 bg-info/10 rounded-lg">
              <p className="text-2xl font-bold text-info">{dashboardData.currentTasks.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center p-4 bg-warning/10 rounded-lg">
              <p className="text-2xl font-bold text-warning">{dashboardData.currentTasks.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <SectionHeader title="Performance" />
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">On-Time Completion</span>
              <Badge variant="secondary">{dashboardData.overview.onTimeCompletionRate}%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg. Hours per Task</span>
              <Badge variant="secondary">{dashboardData.overview.averageHours}h</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Hours Logged</span>
              <Badge variant="secondary">{dashboardData.overview.totalHours}h</Badge>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Recent Activity */}
      {(dashboardData.activity.recentCompleted.length > 0 ||
        dashboardData.activity.upcomingDeadlines.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {dashboardData.activity.recentCompleted.length > 0 && (
            <ContentCard>
              <SectionHeader title="Recently Completed" />
              <div className="space-y-3 mt-4">
                {dashboardData.activity.recentCompleted.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{getCreatorName(task)}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{task.actualHours}h</Badge>
                  </div>
                ))}
              </div>
            </ContentCard>
          )}

          {dashboardData.activity.upcomingDeadlines.length > 0 && (
            <ContentCard>
              <SectionHeader title="Upcoming Deadlines" />
              <div className="space-y-3 mt-4">
                {dashboardData.activity.upcomingDeadlines.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getPriorityBadgeClass(task.priority)}>
                      {getPriorityDisplay(task.priority)}
                    </Badge>
                  </div>
                ))}
              </div>
            </ContentCard>
          )}
        </div>
      )}

      {/* Tasks Section */}
      <SectionHeader
        title="Your Tasks"
        description={totalItems > 0 ? `${totalItems} assigned tasks` : undefined}
      />

      <div className="mb-4">
        <TaskFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} />
      </div>

      {filteredTasks.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={ClipboardList}
            title="No tasks assigned yet"
            description="Tasks will appear here once your executive assigns them to you"
          />
        </ContentCard>
      ) : (
        <>
          <TaskTable
            tasks={currentTasks}
            showAssignee={false}
            showExecutive
            onEdit={(task) => {
              setDrawerTaskId(task.id);
              setDrawerOpen(true);
            }}
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

      <TaskEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        taskId={drawerTaskId}
        initialTab="details"
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={() => {}}
      />
    </DashboardLayout>
  );
};

export default DashboardTeamMember;
