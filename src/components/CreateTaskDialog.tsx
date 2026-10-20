// src/components/dashboard/CreateTaskDialog.tsx

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { api, CompanyMember } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import useGoogleIntegrationStatus from "@/hooks/use-google-integration";

import { User, Clock, X, Plus, Paperclip } from "lucide-react";
import { getFileIcon } from "@/utils/fileIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import TeamSelector from "@/components/TeamSelector";
import { AssigneeMultiSelect } from "@/components/tasks/AssigneeMultiSelect";
import { assignableMembers } from "@/lib/memberIdentity";
import { useTemplateNavigation } from "@/components/templates/useTemplateNavigation";
import UseTemplateFlow from "@/components/templates/UseTemplateFlow";
import CustomFieldsForm from "@/components/customFields/CustomFieldsForm";
import { canonicalTaskCategories, matchTaskCategory } from "@/lib/taskCategories";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  projectId?: string;
  /** Pre-fills the Deadline field (datetime-local value) when the dialog opens, e.g. from a calendar date. */
  initialDeadline?: string;
}

const CreateTaskDialog = ({ open, onOpenChange, onSuccess, projectId, initialDeadline }: CreateTaskDialogProps) => {
  const [templateOpen, setTemplateOpen] = useState(false);
  const goTask = useTemplateNavigation("task");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceRole } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const googleStatus = useGoogleIntegrationStatus();

  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // workspace members (NOT public team members)
  const [members, setMembers] = useState<CompanyMember[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    deadline: "",
    category: "",
    assigneeIds: [] as string[], // USER IDs (never display names)
    teamId: null as string | null,
  });
  const canCreateTaskByPolicy = projectId
    ? canPerformRoleOperation("create_project_tasks", workspaceRole)
    : canPerformRoleOperation("create_tasks", workspaceRole);

  const canAssignOthers = canPerformRoleOperation("assign_workspace_members");
  const { user } = useAuth();

  useEffect(() => {
    if (open) setCustomFields({});
    if (open && initialDeadline) setFormData((prev) => ({ ...prev, deadline: initialDeadline }));
  }, [open, initialDeadline]);

  useEffect(() => {
    if (!open) return;
    let current = true;
    Promise.resolve().then(() => api.getTasks()).then((response) => {
      if (!current) return;
      setCategorySuggestions(canonicalTaskCategories((response.data?.tasks || []).map((task) => task.category)));
    }).catch(() => setCategorySuggestions([]));
    return () => { current = false; };
  }, [open]);

  useEffect(() => {
    if (open && canAssignOthers) fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canAssignOthers]);

  // Team tasks may only be assigned to members of that Team (the backend enforces it; the picker mirrors it).
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    const teamId = formData.teamId;
    if (!open || !teamId) { setTeamMemberIds(null); return; }
    let current = true;
    api.getTeam(teamId).then((res) => {
      if (!current) return;
      const ids = new Set<string>((res.data?.team?.memberLinks || []).map((link) => link.companyMember?.userId).filter(Boolean) as string[]);
      const lead = res.data?.team?.leadMember?.userId; if (lead) ids.add(lead);
      setTeamMemberIds(ids);
      setFormData((prev) => ({ ...prev, assigneeIds: prev.assigneeIds.filter((id) => ids.has(id)) }));
    }).catch(() => { if (current) setTeamMemberIds(new Set()); });
    return () => { current = false; };
  }, [open, formData.teamId]);
  const pickerMembers = teamMemberIds ? members.filter((m) => teamMemberIds.has(m.userId)) : members;

  const fetchMembers = async () => {
    try {
      setMembersLoading(true);

      const res = await api.getCompanyTeam();
      const data = (res as any)?.data || {};

      const list: CompanyMember[] = Array.isArray(data.members)
        ? data.members
        : Array.isArray(data.team_members)
        ? data.team_members
        : [];

      setMembers(assignableMembers(list, user?.id));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);

    const uniqueNewFiles = newFiles.filter(
      (newFile) =>
        !files.some(
          (existingFile) => existingFile.name === newFile.name && existingFile.size === newFile.size
        )
    );

    if (uniqueNewFiles.length !== newFiles.length) {
      toast({
        title: "Duplicate Files",
        description: "Some files were already added and were skipped.",
      });
    }

    if (uniqueNewFiles.length > 0) setFiles((prev) => [...prev, ...uniqueNewFiles]);
    setFileInputKey(Date.now());
  };

  const removeAttachment = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const clearAllAttachments = () => {
    if (files.length === 0) return;
    if (confirm(`Remove all ${files.length} attachments?`)) setFiles([]);
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.deadline) {
      toast({
        title: "Missing Fields",
        description: "Please complete all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (projectId) {
        // Project task endpoint expects JSON
        const payload = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          deadline: new Date(formData.deadline).toISOString(),
          category: formData.category,
          ...(formData.assigneeIds.length ? { assigneeId: formData.assigneeIds[0], assigneeIds: formData.assigneeIds } : {}),
          teamId: formData.teamId,
          customFields,
        };
        await api.createProjectTask(projectId, payload);
      } else {
        // General task endpoint expects FormData (supports files)
        const form = new FormData();
        form.append("title", formData.title);
        form.append("description", formData.description);
        form.append("priority", formData.priority);
        form.append("deadline", new Date(formData.deadline).toISOString());
        form.append("category", formData.category);
        form.append("customFields", JSON.stringify(customFields));

        if (formData.assigneeIds.length) { form.append("assigneeId", formData.assigneeIds[0]); form.append("assigneeIds", JSON.stringify(formData.assigneeIds)); }
        if (formData.teamId) form.append("teamId", formData.teamId);
        files.forEach((file) => form.append("files", file));

        await api.createTask(form);
      }

      toast({ title: "Task Created", description: "Your task was created successfully." });

      setFormData({
        title: "",
        description: "",
        priority: "medium",
        deadline: "",
        category: "",
        assigneeIds: [],
        teamId: null,
      });

      setFiles([]);
      setCustomFields({});
      setFileInputKey(Date.now());

      for (const root of ["tasks", "dashboard", "all-tasks-cross-workspace", "notifications"]) void queryClient.invalidateQueries({ queryKey: [root] });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message ?? "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[96vw] sm:w-[92vw] max-h-[92dvh] overflow-y-auto rounded-xl p-5 sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Create New Task
          </DialogTitle>
          <DialogDescription>Set a clear outcome, owner and deadline. You can add details and files as needed.</DialogDescription>
        </DialogHeader>

        {!projectId && (
          <Button type="button" variant="outline" className="h-auto w-full justify-start border-primary/20 bg-primary/[0.03] p-3 text-left hover:bg-primary/[0.06]" onClick={() => setTemplateOpen(true)}>
            <span className="flex flex-col items-start gap-0.5"><span className="font-medium">Start from a template</span><span className="text-xs font-normal text-muted-foreground">Pre-fill this task using a reusable workspace template.</span></span>
          </Button>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Label htmlFor="create-task-title">Task title *</Label>
            <Input
              id="create-task-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>

          <div><TeamSelector
              value={formData.teamId}
              onChange={(teamId) => setFormData({ ...formData, teamId })}
              disabled={!canAssignOthers}
            /></div>

          <div>
            <Label>Description *</Label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task..."
              required
            />
          </div>

          <div><CustomFieldsForm entityType="task" value={customFields} onChange={setCustomFields} /></div>

          {!projectId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Attachments (Optional)</Label>
                {files.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllAttachments}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <Input id="file-input" key={fileInputKey} type="file" multiple onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif" />

              <div className="mb-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerFileInput}
                  className="w-full flex items-center justify-center gap-2 border-dashed hover:bg-muted/50"
                >
                  <Plus className="w-4 h-4" />
                  Add Files
                  <span className="text-xs text-muted-foreground ml-auto">{files.length} file(s) selected</span>
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Click to browse or drag and drop files</p>
              </div>

              {files.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                  {files.map((file, idx) => {
                    const Icon = getFileIcon(file.type, file.name);

                    return (
                      <div
                        key={`${file.name}-${file.size}-${idx}`}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">Type: {file.type || "Unknown"}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeAttachment(idx)}
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerFileInput}
                    className="w-full flex items-center justify-center gap-2 border-dashed mt-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add More Files
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task-category">Category <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="task-category"
                list="task-category-suggestions"
                value={formData.category}
                onChange={(e) => {
                  const typed = e.target.value;
                  const matching = matchTaskCategory(typed, categorySuggestions);
                  setFormData({ ...formData, category: matching ?? typed });
                }}
                placeholder="e.g., Documentation"
              />
              <datalist id="task-category-suggestions">{categorySuggestions.map((category) => <option key={category} value={category} />)}</datalist>
            </div>

            <div>
              <Label>Priority *</Label>
              <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Deadline *</Label>
            <Input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
            {/* Informational helper when Google Calendar is connected and a deadline is selected */}
            {formData.deadline && googleStatus.data?.connected ? (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">📅 This task will automatically be added to your Google Calendar.</p>
            ) : null}
          </div>

          <div>
            <Label>Assignees (Optional)</Label>

            {!canAssignOthers ? (
              <div className="space-y-2 mt-2">
                <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                  <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p>You can only assign tasks to yourself</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  aria-pressed={formData.assigneeIds.includes(user?.id || "")}
                  onClick={() => setFormData({ ...formData, assigneeIds: formData.assigneeIds.includes(user?.id || "") ? [] : user?.id ? [user.id] : [] })}
                >
                  {formData.assigneeIds.includes(user?.id || "") ? "✓ " : ""}Assign to Me
                </Button>
              </div>
            ) : (
              <AssigneeMultiSelect
                members={pickerMembers}
                value={formData.assigneeIds}
                onChange={(ids) => setFormData({ ...formData, assigneeIds: ids })}
                meId={user?.id}
                loading={membersLoading}
              />
            )}
          </div>

          <div className="lg:col-span-2 flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>

            <Button type="submit" disabled={loading || !canCreateTaskByPolicy} className="min-w-[100px]">
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
      <UseTemplateFlow type="task" open={templateOpen} onOpenChange={setTemplateOpen}
        onCreated={(r) => { setTemplateOpen(false); onOpenChange(false); onSuccess(); goTask(r); }} />
    </Dialog>
  );
};

export default CreateTaskDialog;
