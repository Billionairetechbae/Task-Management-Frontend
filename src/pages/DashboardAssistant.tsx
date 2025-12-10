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
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 tasks per page

  /* -------------------------------------------------------
   * FETCH DASHBOARD
   ------------------------------------------------------- */
  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const res = await api.getAssistantDashboard();
      setDashboardData(res.data);

      // Assistants only see tasks assigned to them
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

  /* -------------------------------------------------------
   * PAGINATION HELPERS
   ------------------------------------------------------- */
  const filteredTasks = statusFilter
    ? tasks.filter((t) => t.status === statusFilter)
    : tasks;

  // Calculate pagination values
  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  /* -------------------------------------------------------
   * HELPERS
   ------------------------------------------------------- */
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

  const getCreatorName = (task: any) => {
    if (task?.creator?.firstName && task?.creator?.lastName) {
      return `${task.creator.firstName} ${task.creator.lastName}`;
    }
    return "Executive";
  };

  /* -------------------------------------------------------
   * RENDER
   ------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Logo className="h-6 sm:h-8" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {/* Team Directory */}
            <Button variant="outline" asChild className="gap-2">
              <Link to="/team-directory">
                <Users className="w-4 h-4" />
                Team Directory
              </Link>
            </Button>

            <button className="p-2">
              <HelpCircle className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
            </button>

            <button className="relative p-2">
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
              {dashboardData.overview.overdue > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>

            <Button variant="outline" asChild className="gap-2">
              <Link to="/profile">
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">Profile</span>
              </Link>
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button className="relative p-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {dashboardData.overview.overdue > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/team-directory" onClick={() => setMobileMenuOpen(false)}>
                <Users className="w-4 h-4" />
                Team Directory
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                <User className="w-4 h-4" />
                Profile
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="px-4 sm:px-6 py-6 sm:py-8">

        {/* WELCOME */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome, {user?.firstName}!
          </h2>

          <p className="text-muted-foreground text-sm sm:text-base">
            {user?.isVerified
              ? "Here are your assigned tasks and insights."
              : "Your account needs executive verification before tasks become visible."}
          </p>

          {!user?.isVerified && (
            <Badge variant="outline" className="mt-3 bg-warning/10 text-warning">
              <Clock className="w-3 h-3 mr-1" />
              Pending Verification
            </Badge>
          )}
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
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
          {/* <StatCard 
            label="Total Earnings" 
            value={`$${estimatedEarnings}`} 
            icon={<CheckCircle2 className="text-accent" />} 
          /> */}
        </div>

        {/* CURRENT TASK & PERFORMANCE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <BoxCard title="Current Tasks">
            <KeyValue label="In Progress" value={dashboardData.currentTasks.inProgress} />
            <KeyValue label="Pending" value={dashboardData.currentTasks.pending} />
          </BoxCard>

          <BoxCard title="Performance">
            <KeyValue label="On-Time Completion" value={`${dashboardData.overview.onTimeCompletionRate}%`} />
            <KeyValue label="Avg. Hours per Task" value={`${dashboardData.overview.averageHours}h`} />
          </BoxCard>
        </div>

        {/* RECENT ACTIVITY */}
        {(dashboardData.activity.recentCompleted.length > 0 ||
          dashboardData.activity.upcomingDeadlines.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">

            {/* Recently Completed */}
            {dashboardData.activity.recentCompleted.length > 0 && (
              <BoxCard title="Recently Completed">
                {dashboardData.activity.recentCompleted.slice(0, 3).map((task) => (
                  <ActivityCard
                    key={task.id}
                    title={task.title}
                    subtitle={getCreatorName(task)}
                    badge={`${task.actualHours}h`}
                  />
                ))}
              </BoxCard>
            )}

            {/* Upcoming */}
            {dashboardData.activity.upcomingDeadlines.length > 0 && (
              <BoxCard title="Upcoming Deadlines">
                {dashboardData.activity.upcomingDeadlines.slice(0, 3).map((task) => (
                  <ActivityCard
                    key={task.id}
                    title={task.title}
                    subtitle={`Due ${new Date(task.deadline).toLocaleDateString()}`}
                    badge={getPriorityDisplay(task.priority)}
                    badgeClass={getPriorityColor(task.priority)}
                  />
                ))}
              </BoxCard>
            )}

          </div>
        )}

        {/* TASK FILTERS & PAGINATION INFO */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-2">Your Tasks</h3>
            {!loading && filteredTasks.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} tasks
              </p>
            )}
          </div>

          <div className="flex gap-1 sm:gap-2 border-b border-border overflow-x-auto">
            {["", "pending", "in_progress", "completed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-sm sm:text-base font-semibold whitespace-nowrap ${
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

        {/* PAGINATION CONTROLS - TOP */}
        {!loading && filteredTasks.length > 0 && totalPages > 1 && (
          <div className="mb-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              goToPage={goToPage}
              goToFirstPage={goToFirstPage}
              goToLastPage={goToLastPage}
              goToPrevPage={goToPrevPage}
              goToNextPage={goToNextPage}
            />
          </div>
        )}

        {/* TASK TABLE */}
        {loading ? (
          <div className="bg-card border rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-card border rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No tasks assigned yet</h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              You will see tasks here once assigned.
            </p>
          </div>
        ) : (
          <>
            <TaskListTable
              tasks={currentTasks}
              getCreatorName={getCreatorName}
              getStatusDisplay={getStatusDisplay}
              getPriorityDisplay={getPriorityDisplay}
              getPriorityColor={getPriorityColor}
            />

            {/* PAGINATION CONTROLS - BOTTOM */}
            {totalPages > 1 && (
              <div className="mt-6">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  goToPage={goToPage}
                  goToFirstPage={goToFirstPage}
                  goToLastPage={goToLastPage}
                  goToPrevPage={goToPrevPage}
                  goToNextPage={goToNextPage}
                />
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
};

/* -------------------------------------------------------
 * COMPONENTS
 ------------------------------------------------------- */

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
      <span className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground">{icon}</span>
    </div>
    <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const BoxCard = ({ title, children }: any) => (
  <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{title}</h3>
    <div className="space-y-2 sm:space-y-3">{children}</div>
  </div>
);

const KeyValue = ({ label, value }: any) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-muted-foreground text-xs sm:text-sm">{label}</span>
    <Badge variant="secondary" className="text-xs sm:text-sm">
      {value}
    </Badge>
  </div>
);

const ActivityCard = ({ title, subtitle, badge, badgeClass }: any) => (
  <div className="flex justify-between items-center p-2 sm:p-3 bg-muted/50 rounded-lg">
    <div className="min-w-0 flex-1">
      <p className="font-medium text-sm truncate">{title}</p>
      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>
    <Badge 
      className={`${badgeClass || "bg-accent/10 text-accent border-accent/20"} text-xs`}
    >
      {badge}
    </Badge>
  </div>
);

const TaskListTable = ({
  tasks,
  getCreatorName,
  getStatusDisplay,
  getPriorityDisplay,
  getPriorityColor,
}: any) => (
  <div className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden">
    {/* Desktop Table Header */}
    <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b font-semibold text-sm">
      <div>Task Title</div>
      <div>Assigned By</div>
      <div>Priority</div>
      <div>Deadline</div>
      <div>Status</div>
      <div>Actions</div>
    </div>

    {/* Mobile Cards */}
    <div className="md:hidden space-y-4 p-4">
      {tasks.map((task: Task) => (
        <div
          key={task.id}
          className="border border-border rounded-lg p-4 space-y-3"
        >
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-semibold text-sm flex-1">{task.title}</h4>
            <Badge className={getPriorityColor(task.priority)}>
              {getPriorityDisplay(task.priority)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Assigned By:</span>
              <div className="font-medium text-sm">
                {getCreatorName(task)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Deadline:</span>
              <div className="font-medium text-sm">
                {new Date(task.deadline).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status:</span>
              <div>
                <Badge variant="secondary" className="text-xs">
                  {getStatusDisplay(task.status)}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button variant="link" className="text-primary p-0 h-auto text-sm" asChild>
            <Link to={`/task-details/${task.id}`}>View Details</Link>
          </Button>
        </div>
      ))}
    </div>

    {/* Desktop Rows */}
    {tasks.map((task: Task) => (
      <div
        key={task.id}
        className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b items-center hover:bg-muted/50"
      >
        <div className="font-medium">{task.title}</div>

        <div className="text-muted-foreground">
          {getCreatorName(task)}
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

const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  goToPage,
  goToFirstPage,
  goToLastPage,
  goToPrevPage,
  goToNextPage,
}: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    {/* Page Info */}
    <div className="text-sm text-muted-foreground">
      Showing <span className="font-medium text-foreground">{startIndex + 1}-{Math.min(endIndex, totalItems)}</span> of{" "}
      <span className="font-medium text-foreground">{totalItems}</span> tasks
    </div>

    {/* Desktop Pagination */}
    <div className="hidden sm:flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={goToFirstPage}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrevPage}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page Numbers */}
      <div className="flex items-center gap-1 mx-2">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          // Calculate which pages to show
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(pageNum)}
              className="h-8 w-8 p-0"
            >
              {pageNum}
            </Button>
          );
        })}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={goToNextPage}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goToLastPage}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>

    {/* Mobile Pagination */}
    <div className="flex sm:hidden items-center justify-between w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrevPage}
        disabled={currentPage === 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>
      <span className="text-sm font-medium">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={goToNextPage}
        disabled={currentPage === totalPages}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>

    {/* Items per page selector */}
    <div className="hidden sm:flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Show:</span>
      <select
        className="text-sm border border-border rounded-md px-2 py-1 bg-background"
        value={itemsPerPage}
        disabled // Can be made interactive if you want to change items per page
      >
        <option value="10">10 per page</option>
        <option value="20">20 per page</option>
        <option value="50">50 per page</option>
      </select>
    </div>
  </div>
);

export default DashboardAssistant;