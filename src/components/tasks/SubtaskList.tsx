// src/components/tasks/SubtaskList.tsx - Updated version

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { api, CompanyMember, TaskSubtask } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import TeamSelector from "@/components/TeamSelector";
import { Link } from "react-router-dom";

type Props = {
  taskId: string;
  initialSubtasks?: TaskSubtask[];
  canEdit?: boolean;
  canCreate?: boolean;
  canUpdate?: (subtask: TaskSubtask) => boolean;
  parentTeamId?: string | null;
  onChanged?: (subtasks: TaskSubtask[]) => void;
};

const normalizeSubtasks = (payload: any): TaskSubtask[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subtasks)) return payload.subtasks;
  if (Array.isArray(payload?.data?.subtasks)) return payload.data.subtasks;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const extractSubtask = (payload: any): TaskSubtask | null => {
  if (!payload) return null;
  if (payload?.id && payload?.title) return payload as TaskSubtask;
  if (payload?.subtask?.id && payload?.subtask?.title) return payload.subtask as TaskSubtask;
  if (payload?.data?.id && payload?.data?.title) return payload.data as TaskSubtask;
  if (payload?.data?.subtask?.id && payload?.data?.subtask?.title) return payload.data.subtask as TaskSubtask;
  return null;
};

const SubtaskList = ({ taskId, initialSubtasks = [], canEdit = true, canCreate = canEdit, canUpdate, parentTeamId = null, onChanged }: Props) => {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(initialSubtasks);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<CompanyMember[]>([]);
  const [assigneeId, setAssigneeId] = useState("none");

  useEffect(() => {
    setSubtasks(initialSubtasks);
  }, [initialSubtasks]);

  useEffect(() => {
    let cancelled = false;
    if (!parentTeamId) {
      setTeamMembers([]);
      return undefined;
    }
    api.getTeam(parentTeamId).then((response) => {
      if (!cancelled) setTeamMembers((response.data.team.memberLinks || []).map((link) => link.companyMember).filter(Boolean));
    }).catch(() => {
      if (!cancelled) setTeamMembers([]);
    });
    return () => { cancelled = true; };
  }, [parentTeamId]);

  const { total, completed, incomplete } = useMemo(() => {
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.status === "completed").length;
    const incomplete = subtasks.filter((s) => s.status !== "completed");
    return { total, completed, incomplete };
  }, [subtasks]);

  const visibleSubtasks = useMemo(() => {
    if (showCompleted) return subtasks;
    return incomplete;
  }, [subtasks, showCompleted, incomplete]);

  const sync = (next: TaskSubtask[]) => {
    setSubtasks(next);
    onChanged?.(next);
  };

  const loadSubtasks = async () => {
    try {
      const res = await api.getTaskSubtasks(taskId);
      sync(normalizeSubtasks(res));
    } catch {
      // rely on initial payload if endpoint fails
    }
  };

  const createSubtask = async () => {
    if (!title.trim() || !canEdit) return;
    const optimistic: TaskSubtask = {
      id: `tmp-${Date.now()}`,
      taskId,
      title: title.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const previous = subtasks;
    sync([optimistic, ...subtasks]);
    setTitle("");

    try {
      setSaving(true);
      const res = await api.createTaskSubtask(taskId, {
        title: optimistic.title,
        teamId: parentTeamId || teamId,
        assigneeId: parentTeamId && assigneeId !== "none" ? assigneeId : undefined,
      });
      const created = extractSubtask(res) || optimistic;
      sync([created, ...previous]);
    } catch (error: any) {
      sync(previous);
      toast({ title: "Could not create subtask", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (subtask: TaskSubtask, checked: boolean) => {
    const previous = subtasks;
    const nextStatus = checked ? "completed" : "pending";
    sync(subtasks.map((s) => (s.id === subtask.id ? { ...s, status: nextStatus } : s)));
    try {
      await api.updateTaskSubtask(taskId, subtask.id, { status: nextStatus });
    } catch (error: any) {
      sync(previous);
      toast({ title: "Could not update subtask", description: error.message, variant: "destructive" });
    }
  };

  const saveInlineTitle = async (subtask: TaskSubtask) => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) return;
    const previous = subtasks;
    sync(subtasks.map((s) => (s.id === subtask.id ? { ...s, title: nextTitle } : s)));
    setEditingId(null);
    try {
      await api.updateTaskSubtask(taskId, subtask.id, { title: nextTitle });
    } catch (error: any) {
      sync(previous);
      toast({ title: "Could not rename subtask", description: error.message, variant: "destructive" });
    }
  };

  const deleteSubtask = async (subtask: TaskSubtask) => {
    const previous = subtasks;
    sync(subtasks.filter((s) => s.id !== subtask.id));
    try {
      await api.deleteTaskSubtask(taskId, subtask.id);
    } catch (error: any) {
      sync(previous);
      toast({ title: "Could not delete subtask", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {completed}/{total} completed
          </p>
          {total > 0 && (
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }} 
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {subtasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? (
                <>Hide completed <ChevronUp size={14} /></>
              ) : (
                <>Show completed ({completed}) <ChevronDown size={14} /></>
              )}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={loadSubtasks} className="h-7 text-xs">
            Refresh
          </Button>
        </div>
      </div>

      {/* Create input */}
      {canCreate && (
        <div className="space-y-2">
          <Input
            placeholder="Create a subtask..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createSubtask()}
            className="flex-1"
          />
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              {parentTeamId ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Assign to Team member</p>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.user?.firstName} {member.user?.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {teamMembers.length === 0 && <p className="text-xs text-muted-foreground">No active members are available in this Team.</p>}
                </div>
              ) : (
                <TeamSelector value={teamId} onChange={setTeamId} label="Team (optional)" />
              )}
            </div>
            <Button size="sm" onClick={createSubtask} disabled={!title.trim() || saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</Button>
          </div>
        </div>
      )}

      {/* Subtasks list - scrollable */}
      {subtasks.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
          No subtasks yet.
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1.5">
          {visibleSubtasks.map((subtask) => (
            <div 
              key={subtask.id} 
              className={cn(
                "flex items-center gap-2 rounded-md border p-2 transition-all",
                subtask.status === "completed" && "bg-muted/30 opacity-70"
              )}
            >
              {(() => {
                const canUpdateSubtask = canEdit || canUpdate?.(subtask) === true;
                return (
                  <>
              <Checkbox
                checked={subtask.status === "completed"}
                onCheckedChange={(checked) => toggleStatus(subtask, !!checked)}
                disabled={!canUpdateSubtask}
                className="shrink-0"
              />
              {editingId === subtask.id ? (
                <Input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveInlineTitle(subtask);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 h-7 text-sm"
                />
              ) : (
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-left text-sm truncate transition-all",
                    subtask.status === "completed" && "line-through text-muted-foreground"
                  )}
                  onClick={() => {
                    if (!canEdit) return;
                    setEditingId(subtask.id);
                    setEditingTitle(subtask.title);
                  }}
                >
                  {subtask.title}
                </button>
              )}
              <Link to={`/tasks/${subtask.id}`} className="text-xs text-primary hover:underline">Open</Link>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={subtask.status} onValueChange={(status) => api.updateTaskSubtask(taskId, subtask.id, { status }).then(() => loadSubtasks()).catch((error: any) => toast({ title: "Could not update subtask", description: error.message, variant: "destructive" }))} disabled={!canUpdateSubtask}>
                  <SelectTrigger className="h-7 w-[112px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {editingId === subtask.id && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveInlineTitle(subtask)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canEdit && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteSubtask(subtask)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubtaskList;