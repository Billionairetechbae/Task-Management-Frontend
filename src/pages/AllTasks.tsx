import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, AllTasksFilters } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  PageHeader,
  ContentCard,
  LoadingState,
  EmptyState,
} from "@/components/dashboard/DashboardComponents";
import {
  TaskTable,
  Pagination,
} from "@/components/dashboard/TaskComponents";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Search, RotateCcw, Bell, GitBranch } from "lucide-react";
import { filterTopLevelTasks, getTaskSubtaskCount } from "@/lib/taskListUtils";

const AllTasks = () => {
  const location = useLocation();
  const { workspaces } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [companyId, setCompanyId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [hasSubtasksOnly, setHasSubtasksOnly] = useState(false);

  const isMyTasksRoute = location.pathname.includes("/tasks/my");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const filters: AllTasksFilters = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
    companyId: companyId === "all" ? undefined : companyId,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["all-tasks-cross-workspace", filters],
    queryFn: () => api.getAllTasksCrossWorkspace(filters),
  });

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error fetching tasks",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setPriority("all");
    setCompanyId("all");
    setWatchedOnly(false);
    setHasSubtasksOnly(false);
    setPage(1);
  };

  const tasks = filterTopLevelTasks(data?.data?.tasks || []);
  const filteredTasks = tasks.filter((task: any) => {
    if (watchedOnly && !task.isWatching) return false;
    if (hasSubtasksOnly && getTaskSubtaskCount(task) <= 0) return false;
    return true;
  });

  const pagination = data?.pagination || {
    currentPage: page,
    totalPages: 1,
    totalResults: filteredTasks.length,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + filteredTasks.length;

  const hasActiveFilters =
    !!debouncedSearch ||
    status !== "all" ||
    priority !== "all" ||
    companyId !== "all" ||
    watchedOnly ||
    hasSubtasksOnly;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={isMyTasksRoute ? "My Tasks" : "All Tasks"}
          description={
            isMyTasksRoute
              ? "Focus on tasks assigned to you, including watched and subtask-heavy work."
              : "View and manage tasks across all your workspaces."
          }
        />

        <ContentCard className="shadow-soft">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={priority}
                onValueChange={(val) => {
                  setPriority(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={companyId}
                onValueChange={(val) => {
                  setCompanyId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={watchedOnly ? "default" : "outline"}
                  onClick={() => {
                    setWatchedOnly((v) => !v);
                    setPage(1);
                  }}
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Watched
                </Button>

                <Button
                  variant={hasSubtasksOnly ? "default" : "outline"}
                  onClick={() => {
                    setHasSubtasksOnly((v) => !v);
                    setPage(1);
                  }}
                  className="gap-2"
                >
                  <GitBranch className="h-4 w-4" />
                  Has Subtasks
                </Button>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="gap-2 text-muted-foreground"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset Filters
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {pagination.totalResults} results
                </Badge>

                <Select
                  value={limit.toString()}
                  onValueChange={(val) => {
                    setLimit(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ContentCard>

        {isLoading ? (
          <LoadingState message="Fetching all tasks..." />
        ) : isError ? (
          <ContentCard className="py-12 text-center">
            <p className="mb-2 font-medium text-destructive">Failed to load tasks</p>
            <p className="text-sm text-muted-foreground">
              Please try again later or contact support.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Retry
            </Button>
          </ContentCard>
        ) : filteredTasks.length === 0 ? (
          <ContentCard>
            <EmptyState
              icon={ListChecks}
              title="No tasks found"
              description={
                hasActiveFilters
                  ? "No tasks match your current filters. Try adjusting them."
                  : "You do not have any tasks across your workspaces yet."
              }
              action={
                hasActiveFilters ? (
                  <Button onClick={resetFilters} variant="outline">
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </ContentCard>
        ) : (
          <div className="space-y-4">
            <TaskTable
              tasks={filteredTasks}
              showAssignee={true}
              showExecutive={true}
              showActions={true}
            />
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalResults}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AllTasks;