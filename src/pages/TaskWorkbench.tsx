import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Loader2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Task Workbench entry — sits under Tasks in the sidebar.
 * Loads the user's tasks and auto-navigates to the first one so the
 * full workbench (list + details + collab) is instantly visible.
 */
const TaskWorkbench = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["task-workbench-entry"],
    queryFn: () => api.getAllTasksCrossWorkspace({ page: 1, limit: 1 }),
  });

  useEffect(() => {
    const first = (data?.data?.tasks || [])[0] as any;
    if (first?.id) {
      navigate(`/task-details/${first.id}`, { replace: true });
    }
  }, [data, navigate]);

  return (
    <DashboardLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground animate-fade-in">
        {isLoading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Opening Task Workbench…</p>
          </>
        ) : isError ? (
          <>
            <p className="text-sm">Failed to load tasks.</p>
            <Button size="sm" onClick={() => refetch()}>Retry</Button>
          </>
        ) : (
          <>
            <ListChecks className="h-10 w-10 opacity-40" />
            <p className="text-sm">No tasks available yet.</p>
            <Button size="sm" onClick={() => navigate("/tasks/all")}>Go to All Tasks</Button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TaskWorkbench;
