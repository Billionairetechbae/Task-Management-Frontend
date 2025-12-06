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
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 tasks per page

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

  const handleTaskCreated = () => {
    loadDashboard();
    setCreateTaskOpen(false);
    // Reset to page 1 when new task is created
    setCurrentPage(1);
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

  const getStatusBadge = (status: string) => (
    <Badge
      className={
        status === "completed"
          ? "bg-success text-success-foreground"
          : status === "in_progress"
          ? "bg-primary text-primary-foreground"
          : status === "pending"
          ? "bg-warning text-warning-foreground"
          : "bg-secondary"
      }
    >
      {getStatusDisplay(status)}
    </Badge>
  );

  /* ---------------------------------------------
   * Render
   * --------------------------------------------*/
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
            <Button variant="outline" className="gap-2" asChild>
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
            </button>

            <Button variant="outline" asChild className="gap-2">
              <Link to="/profile">
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">Profile</span>
              </Link>
            </Button>

            <Button className="gap-2" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Delegate Task</span>
              <span className="sm:hidden">New Task</span>
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button className="relative p-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="w-4 h-4" />
            </Button>
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

      {/* PAGE CONTENT */}
      <main className="px-4 sm:px-6 py-6 sm:py-8">
        {/* WELCOME */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Manager Dashboard</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your team and delegate tasks.
          </p>
        </div>

        {/* TEAM OVERVIEW SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-xl font-bold">Team Overview</h3>

          {/* View All Team Members */}
          <Button variant="outline" className="gap-2 w-full sm:w-auto" asChild>
            <Link to="/team-directory">
              <Users className="w-4 h-4" /> View Team Members
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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

        {/* TASK FILTER TABS & PAGINATION INFO */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold mb-2">Tasks</h3>
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
                    ? "border-b-2 border-primary text-primary"
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
          <div className="bg-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border text-center">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState onCreate={() => setCreateTaskOpen(true)} />
        ) : (
          <>
            <TaskTable 
              tasks={currentTasks} 
              getPriorityBadge={getPriorityBadge}
              getStatusBadge={getStatusBadge}
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

      {/* CREATE TASK MODAL */}
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onSuccess={handleTaskCreated}
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
  <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
    <div className="flex items-center justify-between mb-2 sm:mb-3">
      <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
      <div className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground">{icon}</div>
    </div>
    <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const TaskTable = ({ tasks, getPriorityBadge, getStatusBadge }: any) => (
  <div className="bg-card border rounded-xl sm:rounded-2xl overflow-hidden">
    {/* Desktop Table Header */}
    <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b font-semibold text-sm">
      <div>Title</div>
      <div>Assignee</div>
      <div>Priority</div>
      <div>Deadline</div>
      <div>Status</div>
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
            {getStatusBadge(task.status)}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Assignee:</span>
              <div className="font-medium text-sm">
                {task.assignee
                  ? `${task.assignee.firstName} ${task.assignee.lastName}`
                  : "Unassigned"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Priority:</span>
              <div>
                {getPriorityBadge(task.priority)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Deadline:</span>
              <div className="font-medium text-sm">
                {new Date(task.deadline).toLocaleDateString()}
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
        className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b items-center hover:bg-muted/50"
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
          {getStatusBadge(task.status)}
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="bg-card border p-6 sm:p-12 rounded-xl sm:rounded-2xl text-center max-w-lg mx-auto">
    <Plus className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
    <h3 className="text-lg sm:text-xl font-semibold mb-2">No tasks available</h3>
    <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
      Start by delegating a new task to your team.
    </p>
    <Button onClick={onCreate} className="w-full sm:w-auto">
      Create Task
    </Button>
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

export default DashboardManager;