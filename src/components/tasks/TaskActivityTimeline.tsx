import { useMemo, useState } from "react";
import { api, TaskActivity } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getTaskActivityPresentation, stringifyActivityValue } from "@/lib/taskActivityMapper";

type Props = {
  taskId: string;
  initialActivities?: TaskActivity[];
  maxVisible?: number;
};

const normalizeActivities = (payload: any): TaskActivity[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.activities)) return payload.activities;
  if (Array.isArray(payload?.data?.activities)) return payload.data.activities;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const TaskActivityTimeline = ({ taskId, initialActivities = [], maxVisible = 8 }: Props) => {
  const [activities, setActivities] = useState<TaskActivity[]>(initialActivities);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const visibleActivities = useMemo(() => {
    if (expanded) return activities;
    return activities.slice(0, maxVisible);
  }, [activities, expanded, maxVisible]);

  const loadFullActivity = async () => {
    try {
      setLoading(true);
      const res = await api.getTaskActivity(taskId);
      setActivities(normalizeActivities(res));
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  if (activities.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleActivities.map((activity) => {
        const presentation = getTaskActivityPresentation(activity.actionType);
        const Icon = presentation.icon;
        const oldValue = stringifyActivityValue(activity.oldValue);
        const newValue = stringifyActivityValue(activity.newValue);
        return (
          <div key={activity.id} className="flex gap-3 rounded-md border p-3">
            <Icon className={`w-4 h-4 mt-0.5 ${presentation.toneClass}`} />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium capitalize">{presentation.label}</p>
                <Badge variant="outline" className="text-[10px]">
                  {new Date(activity.createdAt).toLocaleString()}
                </Badge>
              </div>
              {activity.user && (
                <p className="text-xs text-muted-foreground">
                  {activity.user.firstName} {activity.user.lastName}
                </p>
              )}
              {(oldValue || newValue) && (
                <p className="text-xs text-muted-foreground">
                  {oldValue ? `From "${oldValue}"` : ""}
                  {oldValue && newValue ? " -> " : ""}
                  {newValue ? `to "${newValue}"` : ""}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {activities.length > maxVisible && !expanded && (
        <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
          Show more
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={loadFullActivity} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh activity"}
      </Button>
    </div>
  );
};

export default TaskActivityTimeline;

