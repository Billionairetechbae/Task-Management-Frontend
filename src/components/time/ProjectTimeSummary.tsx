import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDuration, weekStartInput, localDateInput } from "@/lib/timeTrackingUtils";

export default function ProjectTimeSummary({ projectId }: { projectId: string }) {
  const all = useQuery({ queryKey: ["time-summary", "project", projectId], queryFn: async () => (await api.getTimeTrackingSummary({ projectId })).data, enabled: !!projectId, retry: false });
  const week = useQuery({ queryKey: ["time-summary", "project-week", projectId], queryFn: async () => (await api.getTimeTrackingSummary({ projectId, from: weekStartInput(), to: localDateInput() })).data, enabled: !!projectId, retry: false });
  if (all.isError) return null;
  const data = all.data;
  return <section className="rounded-lg border bg-background p-3" aria-label="Project time summary">
    <div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-primary" /><h3 className="text-xs font-semibold">Tracked time</h3></div><a href="https://www.admiino.com/guide/projects#time-tracking" target="_blank" rel="noreferrer" className="text-[10px] font-medium text-primary hover:underline">Learn more</a></div>
    {all.isLoading ? <div className="h-12 animate-pulse rounded bg-muted" /> : <>
      <div className="grid grid-cols-2 gap-2 text-xs"><div><span className="text-muted-foreground">Total</span><p className="mt-0.5 font-semibold">{formatDuration(data?.totalSeconds || 0)}</p></div><div><span className="text-muted-foreground">This week</span><p className="mt-0.5 font-semibold">{formatDuration(week.data?.totalSeconds || 0)}</p></div><div><span className="text-muted-foreground">Billable</span><p className="mt-0.5 font-semibold">{formatDuration(data?.billableSeconds || 0)}</p></div><div><span className="text-muted-foreground">Non-billable</span><p className="mt-0.5 font-semibold">{formatDuration(data?.nonBillableSeconds || 0)}</p></div></div>
      {!!data?.byUser.length && <div className="mt-3 border-t pt-2"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Top contributors</p>{data.byUser.slice(0, 3).map((person) => <div key={person.userId || person.userNameSnapshot} className="flex justify-between gap-2 py-0.5 text-xs"><span className="truncate">{person.userNameSnapshot}</span><span className="shrink-0 font-medium">{formatDuration(person.durationSeconds)}</span></div>)}</div>}
      {!!data?.byTask.length && <div className="mt-2 border-t pt-2"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Most tracked Tasks</p>{data.byTask.slice(0, 3).map((task) => <div key={task.taskId || task.taskTitleSnapshot} className="flex justify-between gap-2 py-0.5 text-xs">{task.taskId ? <Link to={`/task-details/${task.taskId}`} className="truncate hover:text-primary">{task.taskTitleSnapshot}</Link> : <span className="truncate">{task.taskTitleSnapshot}</span>}<span className="shrink-0 font-medium">{formatDuration(task.durationSeconds)}</span></div>)}</div>}
    </>}
  </section>;
}
