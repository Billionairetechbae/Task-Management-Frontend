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
  /** Canonical personal view (created by me OR assigned to me), computed server-side for every role. */
  myTasks: Task[];
  myStats: DashboardTaskStats;
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

const emptyStats = (): DashboardTaskStats => computeMemberStats([]);

/** Personal metrics and list come from the SAME canonical backend population as /tasks/my (creator OR assignee). */
const fetchPersonal = async (): Promise<{ myTasks: Task[]; myStats: DashboardTaskStats }> => {
  const [summaryRes, listRes] = await Promise.all([
    api.getMyTaskSummary(),
    api.getAllTasksCrossWorkspace({ scope: "assigned_workspace", limit: 50 }),
  ]);
  const s = summaryRes.data.summary;
  return {
    myTasks: filterTopLevelTasks(listRes.data?.tasks || []) as Task[],
    myStats: {
      totalTasks: s.totalTasks,
      pendingTasks: s.pendingTasks,
      inProgressTasks: s.inProgressTasks,
      completedTasks: s.completedTasks,
      overdueTasks: s.overdueTasks,
      urgentTasks: s.urgentTasks,
      completionRate: s.completionRate,
    },
  };
};

export const fetchDashboardData = async (
  workspaceRole: string | null | undefined,
  _userId?: string
): Promise<DashboardData> => {
  const personal = await fetchPersonal();
  if (workspaceRole === "member") {
    return { tasks: personal.myTasks, ...personal, teamStats: emptyTeamStats, taskStats: personal.myStats };
  }

  const response = await api.getExecutiveDashboard();
  const {
    overview = { team: emptyTeamStats, tasks: emptyStats() },
    recentActivity = { tasks: [] as Task[] },
  } = (response.data || {}) as any;

  const team = overview.team || emptyTeamStats;
  const taskOverview = overview.tasks || emptyStats();

  // Filter to remove subtasks only - project tasks are workspace tasks and should appear
  const dashboardTasks = filterTopLevelTasks(recentActivity.tasks || []) as Task[];

  return {
    tasks: dashboardTasks,
    ...personal,
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

export const fetchProjects = async (customFieldColumns: string[] = []): Promise<Project[]> => {
  const res = await api.getProjects({ customFieldColumns });
  const arr =
    (res as any)?.data?.projects || (res as any)?.projects || (res as any)?.data || [];
  return Array.isArray(arr) ? arr : [];
};

export const useProjectsQuery = (customFieldColumns: string[] = []) => {
  const { activeCompanyId, user } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.projects(activeCompanyId), { customFieldColumns }],
    queryFn: () => fetchProjects(customFieldColumns),
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
      const apply = (list: any[]) => list.map((t: any) => (t.id === taskId ? { ...t, ...patch } : t));
      return { ...old, tasks: apply(old.tasks), ...(Array.isArray(old.myTasks) ? { myTasks: apply(old.myTasks) } : {}) };
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
      return { ...old, tasks: old.tasks.filter((t: any) => t.id !== taskId), ...(Array.isArray(old.myTasks) ? { myTasks: old.myTasks.filter((t: any) => t.id !== taskId) } : {}) };
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
    queryClient.invalidateQueries({ queryKey: ["all-tasks-cross-workspace"] });
  };

  return { patchTaskEverywhere, removeTaskEverywhere, invalidateTasks };
};
