import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Loader2, Square } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { elapsedSeconds, formatDuration } from "@/lib/timeTrackingUtils";

export default function GlobalTimerIndicator() {
  const { activeCompanyId, workspaceRole } = useAuth();
  const client = useQueryClient();
  const allowed = ["owner", "admin", "manager", "member"].includes(String(workspaceRole));
  const key = ["time-active", activeCompanyId];
  const query = useQuery({ queryKey: key, queryFn: async () => (await api.getActiveTimeTimer()).data.timer, enabled: !!activeCompanyId && allowed, retry: false, refetchInterval: 60_000 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const stop = useMutation({ mutationFn: (id: string) => api.stopTimeTimer(id), onSuccess: () => { client.invalidateQueries({ queryKey: key }); client.invalidateQueries({ queryKey: ["time-entries", activeCompanyId] }); client.invalidateQueries({ queryKey: ["time-summary", activeCompanyId] }); } });
  const timer = query.data;
  if (!timer || query.isError || !allowed) return null;
  return <div className="hidden max-w-[230px] items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 pl-2 sm:flex" title={`Timer running: ${timer.taskTitleSnapshot}`}>
    <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />
    <Link to={`/task-details/${timer.taskId}`} className="min-w-0 truncate text-xs font-medium hover:text-primary">{timer.taskTitleSnapshot}</Link>
    <span className="shrink-0 font-mono text-[11px] tabular-nums text-primary">{formatDuration(elapsedSeconds(timer, now))}</span>
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Stop running timer" title="Stop timer" disabled={stop.isPending} onClick={() => stop.mutate(timer.id)}>{stop.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3 w-3" />}</Button>
  </div>;
}
