// src/components/tasks/SubtaskList.tsx - Updated version

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { api, TaskSubtask } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  taskId: string;
  initialSubtasks?: TaskSubtask[];
  canEdit?: boolean;
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

const SubtaskList = ({ taskId, initialSubtasks = [], canEdit = true, onChanged }: Props) => {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(initialSubtasks);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    setSubtasks(initialSubtasks);
  }, [initialSubtasks]);

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
      const res = await api.createTaskSubtask(taskId, { title: optimistic.title });
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
      {canEdit && (
        <div className="flex gap-2">
          <Input
            placeholder="Create a subtask..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createSubtask()}
            className="flex-1"
          />
          <Button size="sm" onClick={createSubtask} disabled={!title.trim() || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
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
              <Checkbox
                checked={subtask.status === "completed"}
                onCheckedChange={(checked) => toggleStatus(subtask, !!checked)}
                disabled={!canEdit}
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
              <div className="flex items-center gap-0.5 shrink-0">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubtaskList;