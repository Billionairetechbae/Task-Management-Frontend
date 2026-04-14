import { useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { api, TaskSubtask } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

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

const SubtaskList = ({ taskId, initialSubtasks = [], canEdit = true, onChanged }: Props) => {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(initialSubtasks);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const completion = useMemo(() => {
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.status === "completed").length;
    return { total, completed };
  }, [subtasks]);

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
      const created = (res as any)?.data?.subtask || (res as any)?.data || optimistic;
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {completion.completed}/{completion.total} completed
        </p>
        <Button variant="ghost" size="sm" onClick={loadSubtasks}>
          Refresh
        </Button>
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <Input
            placeholder="Create a subtask"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createSubtask()}
          />
          <Button size="sm" onClick={createSubtask} disabled={!title.trim() || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {subtasks.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No subtasks yet.
        </div>
      ) : (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 rounded-md border p-2">
              <Checkbox
                checked={subtask.status === "completed"}
                onCheckedChange={(checked) => toggleStatus(subtask, !!checked)}
                disabled={!canEdit}
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
                />
              ) : (
                <button
                  type="button"
                  className={`flex-1 text-left text-sm ${subtask.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                  onClick={() => {
                    if (!canEdit) return;
                    setEditingId(subtask.id);
                    setEditingTitle(subtask.title);
                  }}
                >
                  {subtask.title}
                </button>
              )}
              {editingId === subtask.id && (
                <Button size="icon" variant="ghost" onClick={() => saveInlineTitle(subtask)}>
                  <Check className="w-4 h-4" />
                </Button>
              )}
              {canEdit && (
                <Button size="icon" variant="ghost" onClick={() => deleteSubtask(subtask)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubtaskList;

