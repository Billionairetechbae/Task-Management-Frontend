import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { api, TaskWatcher } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  taskId: string;
  initialWatcherCount?: number;
  initialIsWatching?: boolean;
  initialRecentWatchers?: TaskWatcher[];
  onChanged?: (next: {
    watcherCount: number;
    isWatching: boolean;
    recentWatchers: TaskWatcher[];
  }) => void;
};

const normalizeWatchers = (payload: any): TaskWatcher[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.watchers)) return payload.watchers;
  if (Array.isArray(payload?.data?.watchers)) return payload.data.watchers;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const initials = (w: TaskWatcher) =>
  `${w.user?.firstName?.[0] || ""}${w.user?.lastName?.[0] || ""}`.toUpperCase();

const TaskWatcherSection = ({
  taskId,
  initialWatcherCount = 0,
  initialIsWatching = false,
  initialRecentWatchers = [],
  onChanged,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [watcherCount, setWatcherCount] = useState(initialWatcherCount);
  const [isWatching, setIsWatching] = useState(initialIsWatching);
  const [recentWatchers, setRecentWatchers] = useState<TaskWatcher[]>(initialRecentWatchers);
  const [saving, setSaving] = useState(false);

  const displayWatchers = useMemo(() => recentWatchers.slice(0, 5), [recentWatchers]);

  useEffect(() => {
    setWatcherCount(initialWatcherCount);
    setIsWatching(initialIsWatching);
    setRecentWatchers(initialRecentWatchers);
  }, [initialWatcherCount, initialIsWatching, initialRecentWatchers]);

  const refreshWatchers = async () => {
    try {
      const res = await api.getTaskWatchers(taskId);
      const list = normalizeWatchers(res);
      const userIsWatching = !!user?.id && list.some((watcher) => watcher.userId === user.id);
      setRecentWatchers(list);
      setWatcherCount(list.length);
      setIsWatching(userIsWatching);
      onChanged?.({
        watcherCount: list.length,
        isWatching: userIsWatching,
        recentWatchers: list,
      });
    } catch {
      // keep current values
    }
  };

  const toggleWatch = async () => {
    const next = !isWatching;
    setIsWatching(next);
    setWatcherCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try {
      setSaving(true);
      if (next) await api.watchTask(taskId);
      else await api.unwatchTask(taskId);
      await refreshWatchers();
    } catch (error: any) {
      setIsWatching(!next);
      setWatcherCount((c) => (!next ? c + 1 : Math.max(0, c - 1)));
      toast({ title: "Could not update watch status", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{watcherCount} watcher(s)</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refreshWatchers}>
            Refresh
          </Button>
          <Button variant={isWatching ? "outline" : "default"} size="sm" onClick={toggleWatch} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isWatching ? (
              <>
                <BellOff className="w-4 h-4 mr-1" />
                Unwatch
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-1" />
                Watch
              </>
            )}
          </Button>
        </div>
      </div>

      {displayWatchers.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No watchers yet.</div>
      ) : (
        <div className="flex items-center gap-2">
          {displayWatchers.map((watcher, idx) => (
            <Avatar key={`${watcher.userId}-${idx}`} className="w-8 h-8 border">
              <AvatarImage src={watcher.user?.profilePictureUrl || undefined} />
              <AvatarFallback>{initials(watcher)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskWatcherSection;

