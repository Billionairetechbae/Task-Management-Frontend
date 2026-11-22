import { memberLabel } from "@/lib/memberIdentity";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type CompanyMember, type CreateTaskData, type TaskPriority } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Paperclip, User, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TeamSelector from "@/components/TeamSelector";
import CustomFieldsForm from "@/components/customFields/CustomFieldsForm";

interface CreateProjectTaskDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateProjectTaskDialog = ({ projectId, open, onOpenChange, onSuccess }: CreateProjectTaskDialogProps) => {
  const { toast } = useToast();
  const { user, workspaceRole } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<File[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    deadline: "",
    assigneeId: "",
    category: "",
    teamId: null as string | null,
  });
  const canCreateProjectTask = canPerformRoleOperation("create_project_tasks", workspaceRole);
  const canAssignOthers = canPerformRoleOperation("assign_workspace_members");

  useEffect(() => {
    if (open) {
      if (createdTaskId) return;
      setForm({ title: "", description: "", priority: "medium", deadline: "", assigneeId: "", category: "", teamId: null });
      setFiles([]);
      setPendingUploads([]);
      setCustomFields({});
      if (canAssignOthers) {
        api.getCompanyTeam().then(r => setMembers(r.data.members || [])).catch(() => {});
      } else {
        setMembers([]);
      }
    }
  }, [open, canAssignOthers, createdTaskId]);

  const uploadPendingAttachments = async (taskId: string, attachments: File[]) => {
    for (let index = 0; index < attachments.length; index += 1) {
      try {
        await api.uploadTaskAttachments(taskId, [attachments[index]]);
      } catch (uploadError) {
        const remaining = attachments.slice(index);
        setPendingUploads(remaining);
        toast({
          title: "Task created, but some attachments failed",
          description: `${remaining.length} attachment${remaining.length === 1 ? "" : "s"} still need uploading. Retry here; the task will not be created again. ${uploadError instanceof Error ? uploadError.message : ""}`.trim(),
          variant: "destructive",
        });
        onSuccess();
        return false;
      }
    }
    setPendingUploads([]);
    return true;
  };

  const handleSubmit = async () => {
    if (createdTaskId) {
      setLoading(true);
      try {
        const uploaded = await uploadPendingAttachments(createdTaskId, pendingUploads);
        if (!uploaded) return;
        setCreatedTaskId(null);
        toast({ title: "Attachments uploaded" });
        onSuccess();
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload: CreateTaskData = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
      };
      if (form.deadline) payload.deadline = form.deadline;
      if (form.assigneeId) payload.assigneeId = form.assigneeId;
      if (form.category) payload.category = form.category;
      payload.teamId = form.teamId;
      payload.customFields = customFields;

      const result = await api.createProjectTask(projectId, payload);
      const taskId = result.data?.id;
      if (!taskId) throw new Error("Task was created but its identifier was not returned.");
      setCreatedTaskId(taskId);
      if (files.length) {
        const uploaded = await uploadPendingAttachments(taskId, files);
        if (!uploaded) return;
      }
      setCreatedTaskId(null);
      toast({ title: "Task created" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Task creation failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task to this project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {createdTaskId && (
            <Alert variant="destructive">
              <AlertDescription>
                Task created. {pendingUploads.length} attachment{pendingUploads.length === 1 ? "" : "s"} remain. Retrying uploads will not create another task.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Optional description" />
          </div>
          <CustomFieldsForm entityType="task" value={customFields} onChange={setCustomFields} />

          <div className="space-y-2">
            <Label htmlFor="project-task-attachments">Attachments</Label>
            <Input
              id="project-task-attachments"
              type="file"
              multiple
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                const uniqueFiles = selected.filter((file) => !files.some((item) => item.name === file.name && item.size === file.size));
                const availableSlots = Math.max(0, 10 - files.length);
                if (uniqueFiles.length > availableSlots) {
                  toast({ title: "Attachment limit reached", description: "A task can have up to 10 uploaded files.", variant: "destructive" });
                }
                setFiles((existing) => [
                  ...existing,
                  ...uniqueFiles.slice(0, availableSlots),
                ]);
                event.target.value = "";
              }}
              aria-describedby="project-task-attachments-help"
            />
            <p id="project-task-attachments-help" className="text-xs text-muted-foreground">
              Up to 10 files. File type and size limits are enforced during upload.
            </p>
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as TaskPriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deadline</Label>
              <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
          </div>

          <TeamSelector
            value={form.teamId}
            onChange={(teamId) => setForm(p => ({ ...p, teamId }))}
            disabled={!canAssignOthers}
          />

          {canAssignOthers ? (
            members.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Assignee</Label>
                <Select value={form.assigneeId} onValueChange={v => setForm(p => ({ ...p, assigneeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {memberLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-3 text-center">
                <User className="w-4 h-4 mx-auto mb-1 opacity-50" />
                You can only assign tasks to yourself
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setForm(p => ({ ...p, assigneeId: user?.id || "" }))}
              >
                {form.assigneeId === user?.id ? "✓ " : ""}Assign to Me
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || (!createdTaskId && !canCreateProjectTask) || (createdTaskId && pendingUploads.length === 0)}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {createdTaskId ? "Retry failed attachments" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectTaskDialog;
