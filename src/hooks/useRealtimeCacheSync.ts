import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { websocketService } from "@/lib/websocket";

/**
 * Bridges realtime WebSocket events into the React Query cache so open pages
 * update in place (no polling, no full-page reloads).
 *
 * Cached data stays on screen — we only mark it stale / patch it, so users
 * never see a loading flash when something changes remotely.
 */
export const useRealtimeCacheSync = (isConnected: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const invalidate = (keys: string[]) => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    };

    const patchTask = (taskId: string | undefined, patch: Record<string, any>) => {
      if (!taskId) return;
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
              tasks: old.data.tasks.map((t: any) =>
                t.id === taskId ? { ...t, ...patch } : t
              ),
            },
          };
        }
        return old;
      });
    };

    const onTaskUpdated = (message: any) => {
      const task = message?.task || message?.data?.task;
      patchTask(task?.id || message?.taskId, task || {});
      invalidate(["tasks", "dashboard"]);
    };

    const onTaskCreatedOrDeleted = () => invalidate(["tasks", "dashboard", "projects"]);

    const onComment = (message: any) => {
      const taskId = message?.taskId || message?.comment?.taskId;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    };

    const onProjectEvent = () => invalidate(["projects", "dashboard"]);
    const onNotification = () => invalidate(["notifications"]);

    const listeners: Array<[string, (m: any) => void]> = [
      ["task_updated", onTaskUpdated],
      ["task_status_changed", onTaskUpdated],
      ["task_assigned", onTaskUpdated],
      ["task_created", onTaskCreatedOrDeleted],
      ["task_deleted", onTaskCreatedOrDeleted],
      ["new_comment", onComment],
      ["comment_updated", onComment],
      ["comment_deleted", onComment],
      ["project_updated", onProjectEvent],
      ["project_created", onProjectEvent],
      ["project_deleted", onProjectEvent],
      ["project_task_updated", onProjectEvent],
      ["notification", onNotification],
      ["new_notification", onNotification],
    ];

    listeners.forEach(([event, handler]) => websocketService.on(event, handler));

    return () => {
      listeners.forEach(([event, handler]) => websocketService.off(event, handler));
    };
  }, [isConnected, queryClient]);
};

export default useRealtimeCacheSync;
