import { useState, useEffect } from "react";
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
import { ListChecks, Search, RotateCcw } from "lucide-react";

const AllTasks = () => {
  const { workspaces } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [companyId, setCompanyId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
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
    setPage(1);
  };

  const tasks = data?.data?.tasks || [];
  const pagination = data?.pagination || {
    currentPage: page,
    totalPages: 1,
    totalResults: tasks.length,
    hasNextPage: false,
    hasPrevPage: false,
  };

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + tasks.length;

  return (
    <DashboardLayout>
      <PageHeader
        title="All Tasks"
        description="View and manage tasks across all your workspaces"
      />

      {/* Filters Section */}
      <ContentCard className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
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

          <Select value={priority} onValueChange={(val) => { setPriority(val); setPage(1); }}>
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

          <Select value={companyId} onValueChange={(val) => { setCompanyId(val); setPage(1); }}>
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="flex-1 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ContentCard>

      {/* Results Section */}
      {isLoading ? (
        <LoadingState message="Fetching all tasks..." />
      ) : isError ? (
        <ContentCard className="text-center py-12">
          <p className="text-destructive mb-2 font-medium">Failed to load tasks</p>
          <p className="text-muted-foreground text-sm">Please try again later or contact support.</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
            Retry
          </Button>
        </ContentCard>
      ) : tasks.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={ListChecks}
            title="No tasks found"
            description={debouncedSearch || status !== "all" || priority !== "all" || companyId !== "all"
              ? "No tasks match your current filters. Try adjusting them."
              : "You don't have any tasks assigned across your workspaces yet."
            }
            action={debouncedSearch || status !== "all" || priority !== "all" || companyId !== "all" ? (
              <Button onClick={resetFilters} variant="outline">Clear Filters</Button>
            ) : undefined}
          />
        </ContentCard>
      ) : (
        <>
          <TaskTable tasks={tasks} showAssignee={true} showExecutive={true} />
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalResults}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default AllTasks;
