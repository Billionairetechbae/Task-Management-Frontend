import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, ExternalLink, ListChecks, Users, X } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SubtaskList from "@/components/tasks/SubtaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { taskWorkbenchPath, teamSubtaskPath } from "@/lib/taskExecutionRoutes";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const nameOf = (person: any) => person ? `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unassigned" : "Unassigned";

export default function TeamTaskView() {
  const { teamId, taskId, subtaskId } = useParams<{ teamId: string; taskId: string; subtaskId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const taskQuery = useQuery({ queryKey: ["team-task", teamId, taskId], queryFn: () => api.getTaskById(taskId!), enabled: !!teamId && !!taskId, retry: false });
  const task = taskQuery.data?.data?.task;
  const access = taskQuery.data?.data?.access;
  const execution = taskQuery.data?.data?.execution || task?.execution;
  const belongsToRouteTeam = !!task && String(task.teamId || "") === String(teamId || "") && !task.parentTaskId;
  const canManageSubtasks = !!access?.canEdit && access?.readOnly !== true;
  const completed = (task?.subtasks || []).filter((item) => item?.status === "completed").length;
  const members = useMemo(() => task?.team?.memberLinks || [], [task]);
  const subtaskQuery = useQuery({ queryKey: ["team-task-subtask", subtaskId], queryFn: () => api.getTaskById(subtaskId!), enabled: !!subtaskId, retry: false });
  const selectedSubtask = subtaskQuery.data?.data?.task;
  const selectedAccess = subtaskQuery.data?.data?.access;
  const selectedValid = !subtaskId || (!!selectedSubtask && String(selectedSubtask.teamId || "") === String(teamId) && String(selectedSubtask.parentTaskId || "") === String(taskId));
  const updateSelectedStatus = async (status: string) => { try { await api.updateTaskSubtask(taskId!, subtaskId!, { status }); await subtaskQuery.refetch(); await taskQuery.refetch(); } catch (error: any) { toast({ title: "Could not update sub-task", description: error.message, variant: "destructive" }); } };

  if (taskQuery.isLoading) return <DashboardLayout><p className="p-6 text-sm text-muted-foreground">Loading Team task…</p></DashboardLayout>;
  if (taskQuery.isError || !belongsToRouteTeam || !selectedValid) return <DashboardLayout><div className="p-6"><h1 className="text-lg font-semibold">Team task not available</h1><p className="mt-1 text-sm text-muted-foreground">This task is not available in the selected Team execution context.</p></div></DashboardLayout>;

  return <DashboardLayout><main className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:p-6">
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/teams" className="hover:text-foreground">Teams</Link><span>›</span><span>{task.team?.name || "Team"}</span><span>›</span><span className="text-foreground">Team Task</span>
    </nav>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><div className="mb-2 flex flex-wrap gap-2"><Badge>Assigned to Team</Badge><Badge variant="outline">{task.team?.name || "Team"}</Badge><Badge variant="secondary">Team Execution</Badge></div><h1 className="break-words text-2xl font-bold">{task.title}</h1><p className="mt-1 text-sm text-muted-foreground">Execute this parent task with the Team. Management details remain available in Task Workbench.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button asChild variant="outline"><Link to={taskWorkbenchPath(task.id!)}><ExternalLink className="mr-2 h-4 w-4" />Task Workbench</Link></Button></div>
    </div>
    <div className={`grid gap-4 ${subtaskId ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]" : ""}`}>
      <div className="space-y-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Execution brief</CardTitle></CardHeader><CardContent className="space-y-3"><p className="whitespace-pre-wrap text-sm">{task.description || "No execution instructions provided."}</p><div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline">Status: {task.status}</Badge><Badge variant="outline">Priority: {task.priority || "medium"}</Badge><Badge variant="outline">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No due date"}</Badge>{(task as any).project && <Badge variant="outline">Project: {(task as any).project.name}</Badge>}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" />Sub-tasks <span className="text-xs font-normal text-muted-foreground">{completed} / {(task.subtasks || []).length} complete</span></CardTitle></CardHeader><CardContent><SubtaskList taskId={task.id!} initialSubtasks={(task.subtasks || []).filter(Boolean)} parentTeamId={task.teamId} canEdit={canManageSubtasks} canCreate={canManageSubtasks} canUpdate={(subtask) => subtask.assigneeId === user?.id && access?.canEdit === true} subtaskLinkBuilder={(subtask) => teamSubtaskPath(teamId!, task.id!, subtask.id)} /></CardContent></Card>
      </div>
      {!subtaskId && <section className="grid gap-4 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardTitle className="text-base">Team execution</CardTitle></CardHeader><CardContent className="text-sm">{execution?.total || 0} sub-tasks · {execution?.completed || 0} completed</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-base">Team Lead</CardTitle></CardHeader><CardContent className="text-sm">{nameOf(task.team?.leadMember?.user)}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-base">Collaboration</CardTitle></CardHeader><CardContent className="text-sm">{task.attachments?.length || 0} attachments · {task.activities?.length || 0} recent activity</CardContent></Card></section>}
      {subtaskId && <aside className="fixed inset-0 z-50 overflow-y-auto bg-background p-4 lg:static lg:z-auto lg:border-l lg:p-4"><div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b bg-background pb-3"><div><Badge>SUB-TASK</Badge><h2 className="mt-2 text-lg font-semibold">{selectedSubtask?.title}</h2><p className="text-xs text-muted-foreground">Part of: {task.title} · {task.team?.name}</p></div><Button variant="ghost" size="icon" onClick={() => navigate(teamTaskPath(teamId!, taskId!))} aria-label="Close sub-task"><X className="h-4 w-4" /></Button></div>{subtaskQuery.isLoading ? <p className="py-6 text-sm text-muted-foreground">Loading sub-task…</p> : selectedSubtask && <div className="space-y-4 pt-4"><p className="whitespace-pre-wrap text-sm">{selectedSubtask.description || "No additional instructions provided."}</p><div className="grid gap-2 text-sm"><p><span className="text-muted-foreground">Assignee:</span> {nameOf(selectedSubtask.assignee)}</p><p><span className="text-muted-foreground">Due:</span> {selectedSubtask.deadline ? new Date(selectedSubtask.deadline).toLocaleDateString() : "No due date"}</p><p><span className="text-muted-foreground">Priority:</span> {selectedSubtask.priority || "medium"}</p></div>{selectedAccess?.canEdit && <Select value={selectedSubtask.status || "pending"} onValueChange={updateSelectedStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"].map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>}<Card><CardContent className="pt-6 text-sm text-muted-foreground">{selectedSubtask.attachments?.length || 0} attachments · {selectedSubtask.activities?.length || 0} recent activity. Existing secure Task Workbench attachment, Drive, comment, and activity APIs remain available for this sub-task.</CardContent></Card></div>}</aside>}
    </div>
  </main></DashboardLayout>;
}
