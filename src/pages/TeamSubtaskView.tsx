import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { teamTaskPath } from "@/lib/taskExecutionRoutes";
import { useToast } from "@/hooks/use-toast";

export default function TeamSubtaskView() {
  const { teamId, taskId, subtaskId } = useParams<{ teamId: string; taskId: string; subtaskId: string }>();
  const { toast } = useToast();
  const query = useQuery({ queryKey: ["team-subtask", teamId, taskId, subtaskId], queryFn: () => api.getTaskById(subtaskId!), enabled: !!teamId && !!taskId && !!subtaskId, retry: false });
  const subtask = query.data?.data?.task;
  const access = query.data?.data?.access;
  const valid = !!subtask && String(subtask.teamId || "") === String(teamId || "") && String(subtask.parentTaskId || "") === String(taskId || "");
  const updateStatus = async (status: string) => { try { await api.updateTaskSubtask(taskId!, subtaskId!, { status }); await query.refetch(); } catch (error: any) { toast({ title: "Could not update sub-task", description: error.message, variant: "destructive" }); } };
  if (query.isLoading) return <DashboardLayout><p className="p-6 text-sm text-muted-foreground">Loading sub-task…</p></DashboardLayout>;
  if (query.isError || !valid) return <DashboardLayout><div className="p-6"><h1 className="text-lg font-semibold">Sub-task not available</h1><p className="mt-1 text-sm text-muted-foreground">This item is not available in this Team execution context.</p></div></DashboardLayout>;
  return <DashboardLayout><main className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-6"><nav className="flex flex-wrap gap-1 text-sm text-muted-foreground"><Link to="/teams" className="hover:text-foreground">Teams</Link><span>›</span><Link to={teamTaskPath(teamId!, taskId!)} className="hover:text-foreground">Parent Task</Link><span>›</span><span className="text-foreground">Sub-task</span></nav><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 flex gap-2"><Badge>Sub-task</Badge><Badge variant="outline">Part of Team execution</Badge></div><h1 className="text-2xl font-bold">{subtask.title}</h1><p className="mt-1 text-sm text-muted-foreground">Part of: {subtask.parentTask?.title || "Parent Task"}</p></div><Button asChild variant="outline"><Link to={teamTaskPath(teamId!, taskId!)}>Back to Team Task</Link></Button></div><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" />Execution details</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 text-sm"><p><span className="text-muted-foreground">Team:</span> {subtask.team?.name || "Team"}</p><p><span className="text-muted-foreground">Assignee:</span> {subtask.assignee ? `${subtask.assignee.firstName} ${subtask.assignee.lastName}` : "Unassigned"}</p><p><span className="text-muted-foreground">Due:</span> {subtask.deadline ? new Date(subtask.deadline).toLocaleDateString() : "No due date"}</p><p><span className="text-muted-foreground">Priority:</span> {subtask.priority || "medium"}</p></div><div><p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Instructions</p><p className="whitespace-pre-wrap text-sm">{subtask.description || "No additional instructions provided."}</p></div>{access?.canEdit && <div className="max-w-xs"><p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Status</p><Select value={subtask.status || "pending"} onValueChange={updateStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"].map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>}<p className="text-sm text-muted-foreground">{subtask.attachments?.length || 0} attachments · {subtask.activities?.length || 0} recent activity</p></CardContent></Card></main></DashboardLayout>;
}
