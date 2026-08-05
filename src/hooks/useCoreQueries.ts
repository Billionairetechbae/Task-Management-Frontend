import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Project, Task, TeamMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { filterTopLevelTasks } from "@/lib/taskListUtils";

export interface DashboardTeamStats {
  totalAssistants: number;
  availableAssistants: number;
  pendingVerifications: number;
  totalExecutives: number;
}

export interface DashboardTaskStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  urgentTasks: number;
  completionRate: number;
}

export interface DashboardData {
  tasks: Task[];
  teamStats: DashboardTeamStats;
  taskStats: DashboardTaskStats;
}

const emptyTeamStats: DashboardTeamStats = {
  totalAssistants: 0,
  availableAssistants: 0,
  pendingVerifications: 0,
  totalExecutives: 0,
};

const computeMemberStats = (tasks: Task[]): DashboardTaskStats => {
  const total = tasks.length;
  const completed = tasks.filter((t: any) => t.status === "completed").length;
  return {
    totalTasks: total,
    pendingTasks: tasks.filter((t: any) => t.status === "pending").length,
    inProgressTasks: tasks.filter((t: any) => t.status === "in_progress").length,
    completedTasks: completed,
    overdueTasks: tasks.filter((t: any) => {
      if (!t.deadline) return false;
      return t.status !== "completed" && new Date(t.deadline).getTime() < Date.now();
    }).length,
    urgentTasks: tasks.filter((t: any) => t.priority === "urgent").length,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

export const fetchDashboardData = async (
  workspaceRole: string | null | undefined,
  userId?: string
): Promise<DashboardData> => {
  if (workspaceRole === "member") {
    const res = await api.getTasks();
    const wsTasks = (res as any)?.data?.tasks || [];
    const mine = filterTopLevelTasks(
      wsTasks.filter((task: any) => {
        if (task.assigneeId && task.assigneeId === userId) return true;
        if (Array.isArray(task.assignees) && task.assignees.some((a: any) => a?.id === userId)) {
          return true;
        }
        return false;
      })
    ) as Task[];

    return { tasks: mine, teamStats: emptyTeamStats, taskStats: computeMemberStats(mine) };
  }

  const response = await api.getExecutiveDashboard();
  const {
    overview = { team: emptyTeamStats, tasks: computeMemberStats([]) },
    recentActivity = { tasks: [] as Task[] },
  } = (response.data || {}) as any;

  const team = overview.team || emptyTeamStats;
  const taskOverview = overview.tasks || computeMemberStats([]);

  return {
    tasks: filterTopLevelTasks(recentActivity.tasks || []) as Task[],
    teamStats: {
      totalAssistants: team.totalAssistants || 0,
      availableAssistants: team.availableAssistants || 0,
      pendingVerifications: team.pendingVerifications || 0,
      totalExecutives: team.totalExecutives || 0,
    },
    taskStats: {
      totalTasks: taskOverview.totalTasks || 0,
      pendingTasks: taskOverview.pendingTasks || 0,
      inProgressTasks: taskOverview.inProgressTasks || 0,
      completedTasks: taskOverview.completedTasks || 0,
      overdueTasks: taskOverview.overdueTasks || 0,
      urgentTasks: taskOverview.urgentTasks || 0,
      completionRate: taskOverview.completionRate || 0,
    },
  };
};

/** Workspace-scoped dashboard query. Cached data stays visible while refreshing. */
export const useDashboardData = () => {
  const { activeCompanyId, workspaceRole, user } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboard(activeCompanyId, workspaceRole),
    queryFn: () => fetchDashboardData(workspaceRole, user?.id),
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  });
};

export const fetchProjects = async (): Promise<Project[]> => {
  const res = await api.getProjects();
  const arr =
    (res as any)?.data?.projects || (res as any)?.projects || (res as any)?.data || [];
  return Array.isArray(arr) ? arr : [];
};

export const useProjectsQuery = () => {
  const { activeCompanyId, user } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects(activeCompanyId),
    queryFn: fetchProjects,
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  });
};

export const fetchPendingVerifications = async (): Promise<TeamMember[]> => {
  const response = await api.getPendingVerifications();
  return response.data.pendingAssistants || [];
};

export const usePendingVerificationsQuery = (enabled: boolean) => {
  const { activeCompanyId, user } = useAuth();

  return useQuery({
    queryKey: queryKeys.pendingVerifications(activeCompanyId),
    queryFn: fetchPendingVerifications,
    enabled: enabled && Boolean(user),
    placeholderData: (previous) => previous,
  });
};

/** Helpers for optimistic updates on any cached task collection. */
export const useTaskCacheUpdater = () => {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useAuth();

  const patchTaskEverywhere = (taskId: string, patch: Partial<Task> & Record<string, any>) => {
    queryClient.setQueriesData({ queryKey: ["dashboard"] }, (old: any) => {
      if (!old?.tasks) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: any) => (t.id === taskId ? { ...t, ...patch } : t)),
      };
    });
    queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((t: any) => (t.id === taskId ? { ...t, ...patch } : t));
      }
      if (Array.isArray(old?.data?.tasks)) {
        return {
          ...old,
          data: {
            ...old.data,
            tasks: old.data.tasks.map((t: any) => (t.id === taskId ? { ...t, ...patch } : t)),
          },
        };
      }
      return old;
    });
  };

  const removeTaskEverywhere = (taskId: string) => {
    queryClient.setQueriesData({ queryKey: ["dashboard"] }, (old: any) => {
      if (!old?.tasks) return old;
      return { ...old, tasks: old.tasks.filter((t: any) => t.id !== taskId) };
    });
    queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) return old.filter((t: any) => t.id !== taskId);
      if (Array.isArray(old?.data?.tasks)) {
        return {
          ...old,
          data: { ...old.data, tasks: old.data.tasks.filter((t: any) => t.id !== taskId) },
        };
      }
      return old;
    });
  };

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(activeCompanyId) as any, exact: false });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return { patchTaskEverywhere, removeTaskEverywhere, invalidateTasks };
};
