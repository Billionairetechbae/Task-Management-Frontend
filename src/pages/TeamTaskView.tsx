import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, ExternalLink, ListChecks, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SubtaskList from "@/components/tasks/SubtaskList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { taskWorkbenchPath, teamSubtaskPath } from "@/lib/taskExecutionRoutes";
import { useAuth } from "@/contexts/AuthContext";

const nameOf = (person: any) => person ? `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unassigned" : "Unassigned";

export default function TeamTaskView() {
  const { teamId, taskId } = useParams<{ teamId: string; taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const taskQuery = useQuery({ queryKey: ["team-task", teamId, taskId], queryFn: () => api.getTaskById(taskId!), enabled: !!teamId && !!taskId, retry: false });
  const task = taskQuery.data?.data?.task;
  const access = taskQuery.data?.data?.access;
  const execution = taskQuery.data?.data?.execution || task?.execution;
  const belongsToRouteTeam = !!task && String(task.teamId || "") === String(teamId || "") && !task.parentTaskId;
  const canManageSubtasks = !!access?.canEdit && access?.readOnly !== true;
  const completed = (task?.subtasks || []).filter((item) => item?.status === "completed").length;
  const members = useMemo(() => task?.team?.memberLinks || [], [task]);

  if (taskQuery.isLoading) return <DashboardLayout><p className="p-6 text-sm text-muted-foreground">Loading Team task…</p></DashboardLayout>;
  if (taskQuery.isError || !belongsToRouteTeam) return <DashboardLayout><div className="p-6"><h1 className="text-lg font-semibold">Team task not available</h1><p className="mt-1 text-sm text-muted-foreground">This task is not available in the selected Team execution context.</p></div></DashboardLayout>;

  return <DashboardLayout><main className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:p-6">
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/teams" className="hover:text-foreground">Teams</Link><span>›</span><span>{task.team?.name || "Team"}</span><span>›</span><span className="text-foreground">Team Task</span>
    </nav>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><div className="mb-2 flex flex-wrap gap-2"><Badge>Assigned to Team</Badge><Badge variant="outline">{task.team?.name || "Team"}</Badge><Badge variant="secondary">Team Execution</Badge></div><h1 className="break-words text-2xl font-bold">{task.title}</h1><p className="mt-1 text-sm text-muted-foreground">Execute this parent task with the Team. Management details remain available in Task Workbench.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button asChild variant="outline"><Link to={taskWorkbenchPath(task.id!)}><ExternalLink className="mr-2 h-4 w-4" />Task Workbench</Link></Button></div>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Execution brief</CardTitle></CardHeader><CardContent className="space-y-3"><p className="whitespace-pre-wrap text-sm">{task.description || "No execution instructions provided."}</p><div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline">Status: {task.status}</Badge><Badge variant="outline">Priority: {task.priority || "medium"}</Badge><Badge variant="outline">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No due date"}</Badge>{(task as any).project && <Badge variant="outline">Project: {(task as any).project.name}</Badge>}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" />Sub-tasks <span className="text-xs font-normal text-muted-foreground">{completed} / {(task.subtasks || []).length} complete</span></CardTitle></CardHeader><CardContent><SubtaskList taskId={task.id!} initialSubtasks={(task.subtasks || []).filter(Boolean)} parentTeamId={task.teamId} canEdit={canManageSubtasks} canCreate={canManageSubtasks} canUpdate={(subtask) => subtask.assigneeId === user?.id && access?.canEdit === true} subtaskLinkBuilder={(subtask) => teamSubtaskPath(teamId!, task.id!, subtask.id)} /></CardContent></Card>
      </div>
      <aside className="space-y-4"><Card><CardHeader className="pb-2"><CardTitle className="text-base">Team execution</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{execution?.total || 0} sub-tasks · {execution?.completed || 0} completed</p>{execution?.progressPercent !== null && execution?.progressPercent !== undefined && <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{execution.progressPercent}%</span></div><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${execution.progressPercent}%` }} /></div></div>}<p className="pt-2 text-xs text-muted-foreground">Lead: {nameOf(task.team?.leadMember?.user)}</p></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Team members</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">{members.length ? members.map((link: any) => <p key={link.id || link.companyMemberId}>{nameOf(link.companyMember?.user)}</p>) : <p className="text-muted-foreground">Team membership is available in Team Workspace.</p>}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" />Collaboration</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{task.attachments?.length || 0} attachments · {task.activities?.length || 0} recent activity. Open Task Workbench for the full discussion and attachment workspace.</CardContent></Card></aside>
    </div>
  </main></DashboardLayout>;
}
