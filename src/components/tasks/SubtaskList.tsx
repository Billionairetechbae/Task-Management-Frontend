import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, CompanyMember, TaskPriority, TaskStatus, TaskSubtask } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  taskId: string;
  initialSubtasks?: TaskSubtask[];
  canEdit?: boolean;
  canCreate?: boolean;
  canUpdate?: (subtask: TaskSubtask) => boolean;
  parentTeamId?: string | null;
  subtaskLinkBuilder?: (subtask: TaskSubtask) => string;
  selectedSubtaskId?: string | null;
  filterText?: string;
  onChanged?: (subtasks: TaskSubtask[]) => void;
};

const statusOptions: TaskStatus[] = ["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"];
const priorityOptions: TaskPriority[] = ["low", "medium", "high", "urgent"];
const displayStatus = (status?: string) =>
  ({ pending: "Pending", in_progress: "In Progress", in_review: "In Review", completed: "Completed", delayed: "Delayed", cancelled: "Cancelled" } as Record<string, string>)[status || ""] || "Pending";
const displayPriority = (priority?: string | null) =>
  priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : "Medium";
const displayDate = (value?: string | null) => {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(date);
};
const nameOf = (member?: CompanyMember | null) =>
  member?.user ? `${member.user.firstName} ${member.user.lastName}`.trim() : "Unassigned";
const initials = (name?: string | null) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const errorMessage = (error: unknown) => error instanceof Error && error.message ? error.message : "Please try again.";

const normalizeSubtasks = (payload: any): TaskSubtask[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subtasks)) return payload.subtasks;
  if (Array.isArray(payload?.data?.subtasks)) return payload.data.subtasks;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const extractSubtask = (payload: any): TaskSubtask | null => {
  const candidates = [payload, payload?.subtask, payload?.task, payload?.data, payload?.data?.subtask, payload?.data?.task];
  return candidates.find((item) => item?.id && item?.title) || null;
};

export default function SubtaskList({
  taskId,
  initialSubtasks = [],
  canEdit = true,
  canCreate = canEdit,
  canUpdate,
  parentTeamId = null,
  subtaskLinkBuilder,
  selectedSubtaskId,
  filterText = "",
  onChanged,
}: Props) {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(initialSubtasks);
  const [teamMembers, setTeamMembers] = useState<CompanyMember[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("none");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TaskSubtask | null>(null);

  useEffect(() => setSubtasks(initialSubtasks), [initialSubtasks]);

  useEffect(() => {
    let cancelled = false;
    if (!parentTeamId) {
      setTeamMembers([]);
      return () => { cancelled = true; };
    }
    api.getTeam(parentTeamId).then((response) => {
      if (!cancelled) setTeamMembers((response.data.team.memberLinks || []).map((link) => link.companyMember).filter(Boolean));
    }).catch((error) => {
      if (!cancelled) toast({ title: "Could not load Team members", description: errorMessage(error), variant: "destructive" });
    });
    return () => { cancelled = true; };
  }, [parentTeamId]);

  const publishSubtasks = (next: TaskSubtask[]) => {
    setSubtasks(next);
    onChanged?.(next);
  };
  const total = subtasks.length;
  const completed = subtasks.filter((item) => item.status === "completed").length;
  const visibleSubtasks = useMemo(() => subtasks.filter((item) => {
    const matchesCompleted = showCompleted || item.status !== "completed";
    const matchesText = !filterText.trim() || item.title.toLocaleLowerCase().includes(filterText.trim().toLocaleLowerCase());
    return matchesCompleted && matchesText;
  }), [subtasks, showCompleted, filterText]);

  const loadSubtasks = async () => {
    try {
      setRefreshing(true);
      const response = await api.getTaskSubtasks(taskId);
      publishSubtasks(normalizeSubtasks(response));
    } catch (error) {
      toast({ title: "Could not refresh sub-tasks", description: errorMessage(error), variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDeadline("");
    setAssigneeId("none");
  };

  const createSubtask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !canCreate) return;
    const temporaryId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: TaskSubtask = {
      id: temporaryId,
      taskId,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null,
      assigneeId: assigneeId === "none" ? null : assigneeId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    const previous = subtasks;
    publishSubtasks([optimistic, ...previous]);
    setCreateOpen(false);
    resetForm();
    try {
      setSaving(true);
      const response = await api.createTaskSubtask(taskId, {
        title: optimistic.title,
        description: optimistic.description || undefined,
        priority: optimistic.priority || undefined,
        deadline: optimistic.deadline || undefined,
        assigneeId: optimistic.assigneeId || undefined,
      });
      const created = extractSubtask(response);
      if (!created) {
        throw new Error("The server did not return the created sub-task. Refresh and check before retrying.");
      }
      publishSubtasks([created, ...previous]);
    } catch (error) {
      publishSubtasks(previous);
      toast({ title: "Could not create sub-task", description: errorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateSubtask = async (subtask: TaskSubtask, updates: Partial<TaskSubtask>) => {
    const previous = subtasks;
    publishSubtasks(subtasks.map((item) => item.id === subtask.id ? { ...item, ...updates } : item));
    try {
      setSavingId(subtask.id);
      await api.updateTaskSubtask(taskId, subtask.id, updates);
    } catch (error) {
      publishSubtasks(previous);
      toast({ title: "Could not update sub-task", description: errorMessage(error), variant: "destructive" });
    } finally {
      setSavingId("");
    }
  };

  const removeSubtask = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const previous = subtasks;
    publishSubtasks(subtasks.filter((item) => item.id !== target.id));
    setDeleteTarget(null);
    try {
      setSavingId(target.id);
      await api.deleteTaskSubtask(taskId, target.id);
    } catch (error) {
      publishSubtasks(previous);
      toast({ title: "Could not delete sub-task", description: errorMessage(error), variant: "destructive" });
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-muted-foreground">{completed}/{total} completed</p>
          {total > 0 && <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${completed / total * 100}%` }} /></div>}
        </div>
        <div className="flex items-center gap-1">
          {completed > 0 && <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setShowCompleted((value) => !value)}>{showCompleted ? <>Hide completed <ChevronUp className="ml-1 h-3 w-3" /></> : <>Show completed ({completed}) <ChevronDown className="ml-1 h-3 w-3" /></>}</Button>}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => void loadSubtasks()} disabled={refreshing} aria-label="Refresh sub-tasks"><RefreshCw className={cn("mr-1 h-3 w-3", refreshing && "animate-spin")} />Refresh</Button>
          {canCreate && <Button type="button" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-3 w-3" />Add subtask</Button>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <div className="min-w-[740px]">
          <div className="grid grid-cols-[minmax(220px,1fr)_130px_105px_115px_118px_34px] items-center border-b bg-muted/30 px-2.5 py-2 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Sub-task</span><span>Assignee</span><span>Due date</span><span>Status</span><span>Priority</span><span />
          </div>
          {visibleSubtasks.length ? visibleSubtasks.map((subtask, index) => {
            const canUpdateItem = canEdit || canUpdate?.(subtask) === true;
            const link = subtaskLinkBuilder ? subtaskLinkBuilder(subtask) : parentTeamId ? `/teams/${parentTeamId}/tasks/${taskId}/subtasks/${subtask.id}` : `/task-details/${subtask.id}`;
            return <div key={subtask.id} className={cn("grid grid-cols-[minmax(220px,1fr)_130px_105px_115px_118px_34px] items-center gap-1 border-b px-2.5 py-1.5 last:border-0 hover:bg-muted/30", selectedSubtaskId === subtask.id && "bg-primary/5 ring-1 ring-inset ring-primary/20", subtask.status === "completed" && "bg-muted/20")}>
              <Link to={link} className="flex min-w-0 items-center gap-2 rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="w-5 shrink-0 text-right text-[9px] tabular-nums text-muted-foreground">{index + 1}</span>
                <span className={cn("truncate text-[11px] font-medium", subtask.status === "completed" && "text-muted-foreground line-through")}>{subtask.title}</span>
              </Link>
              {canEdit ? <Select value={subtask.assigneeId || "none"} onValueChange={(value) => void updateSubtask(subtask, { assigneeId: value === "none" ? null : value })} disabled={savingId === subtask.id}><SelectTrigger aria-label={`Assignee for ${subtask.title}`} className="h-7 border-0 bg-transparent px-1.5 text-[10px] shadow-none"><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{teamMembers.map((member) => <SelectItem key={member.userId} value={member.userId}>{nameOf(member)}</SelectItem>)}</SelectContent></Select> : <span className="truncate text-[10px] text-muted-foreground">{subtask.assignee?.firstName ? `${subtask.assignee.firstName} ${subtask.assignee.lastName || ""}` : "Unassigned"}</span>}
              {canEdit ? <Input aria-label={`Due date for ${subtask.title}`} type="date" value={subtask.deadline?.slice(0, 10) || ""} onChange={(event) => void updateSubtask(subtask, { deadline: event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : null })} className="h-7 border-0 bg-transparent px-1.5 text-[10px] shadow-none" disabled={savingId === subtask.id} /> : <span className="truncate text-[10px] text-muted-foreground">{displayDate(subtask.deadline)}</span>}
              {canUpdateItem ? <Select value={subtask.status || "pending"} onValueChange={(value) => void updateSubtask(subtask, { status: value as TaskStatus })} disabled={savingId === subtask.id}><SelectTrigger aria-label={`Status for ${subtask.title}`} className="h-7 border-0 bg-transparent px-1.5 text-[10px] shadow-none"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((status) => <SelectItem key={status} value={status}>{displayStatus(status)}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline" className="h-5 w-fit text-[9px]">{displayStatus(subtask.status)}</Badge>}
              {canEdit ? <Select value={subtask.priority || "medium"} onValueChange={(value) => void updateSubtask(subtask, { priority: value as TaskPriority })} disabled={savingId === subtask.id}><SelectTrigger aria-label={`Priority for ${subtask.title}`} className="h-7 border-0 bg-transparent px-1.5 text-[10px] shadow-none"><SelectValue /></SelectTrigger><SelectContent>{priorityOptions.map((priority) => <SelectItem key={priority} value={priority}>{displayPriority(priority)}</SelectItem>)}</SelectContent></Select> : <span className="text-[10px] text-muted-foreground">{displayPriority(subtask.priority)}</span>}
              {canEdit && <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${subtask.title}`} className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(subtask)} disabled={savingId === subtask.id}><Trash2 className="h-3.5 w-3.5" /></Button>}
            </div>;
          }) : <div className="px-3 py-8 text-center text-xs text-muted-foreground">{filterText ? "No sub-tasks match your search." : total === 0 ? "No sub-tasks yet. Add one to start execution." : "No sub-tasks match the current view."}</div>}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add sub-task</DialogTitle><DialogDescription>Create a task under this Team task. Team assignment is inherited from the parent.</DialogDescription></DialogHeader>
          <form onSubmit={createSubtask} className="space-y-3">
            <div><Label htmlFor="subtask-title">Title *</Label><Input id="subtask-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={255} className="mt-1" /></div>
            <div><Label htmlFor="subtask-instructions">Instructions</Label><Input id="subtask-instructions" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1"><span className="text-xs font-medium">Assignee</span><Select value={assigneeId} onValueChange={setAssigneeId}><SelectTrigger aria-label="Sub-task assignee"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{teamMembers.map((member) => <SelectItem key={member.userId} value={member.userId}>{nameOf(member)}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1"><span className="text-xs font-medium">Due date</span><Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
              <label className="space-y-1"><span className="text-xs font-medium">Priority</span><Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}><SelectTrigger aria-label="Sub-task priority"><SelectValue /></SelectTrigger><SelectContent>{priorityOptions.map((item) => <SelectItem key={item} value={item}>{displayPriority(item)}</SelectItem>)}</SelectContent></Select></label>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !title.trim()}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create sub-task"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete sub-task?</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.title}” will be permanently deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void removeSubtask(); }}>Delete sub-task</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
