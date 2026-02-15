import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import {
  CalendarIcon,
  Loader2,
  Upload,
  X,
  Download,
  FileText,
  Trash2,
  UserPlus,
  UserMinus,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { api, Task, TeamMember, TaskAttachment, UpdateTaskData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getFileIcon } from "@/utils/fileIcons";

interface TaskEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  initialTab?: string;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function TaskEditDrawer({
  open,
  onOpenChange,
  taskId,
  initialTab = "details",
  onTaskUpdated,
  onTaskDeleted,
}: TaskEditDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isManager = user?.role === "executive" || user?.role === "manager";
  const isAssistant = user?.role === "team_member";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Detail fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [category, setCategory] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [actualHours, setActualHours] = useState<number>(0);

  // Assignee
  const [team_members, setAssistants] = useState<TeamMember[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [loadingAssistants, setLoadingAssistants] = useState(false);

  // Attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
      if (isManager) fetchAssistants();
      setActiveTab(initialTab);
    }
    if (!open) {
      setPendingFiles([]);
      setDeleteConfirmText("");
    }
  }, [open, taskId]);

  const fetchTask = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const res = await api.getTaskById(taskId);
      const t = res.data.task;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description || "");
      setPriority(t.priority);
      setStatus(t.status);
      setDeadline(t.deadline ? new Date(t.deadline) : undefined);
      setCategory(t.category || "");
      setEstimatedHours(t.estimatedHours || 0);
      setActualHours(t.actualHours || 0);
      setSelectedAssigneeId(t.assigneeId || t.assignedAssistantId || null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssistants = async () => {
    try {
      setLoadingAssistants(true);
      const res = await api.getCompanyAssistants();
      setAssistants(res.data.team_members.filter((a) => a.role === "team_member"));
    } catch {
      // silent
    } finally {
      setLoadingAssistants(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!task) return;
    try {
      setSaving(true);

      if (isAssistant) {
        // TeamMembers can only update status + actualHours
        const data: UpdateTaskData = { status: status as any, actualHours };
        const res = await api.updateTask(task.id, data);
        setTask(res.data.task);
        onTaskUpdated(res.data.task);
        toast({ title: "Progress updated" });
      } else {
        // Build multipart form if there are pending files
        if (pendingFiles.length > 0) {
          const fd = new FormData();
          fd.append("title", title);
          fd.append("description", description);
          fd.append("priority", priority);
          fd.append("status", status);
          if (deadline) fd.append("deadline", deadline.toISOString());
          fd.append("category", category);
          fd.append("estimatedHours", String(estimatedHours));
          if (selectedAssigneeId) fd.append("assigneeId", selectedAssigneeId);
          pendingFiles.forEach((f) => fd.append("files", f));

          const res = await api.updateTask(task.id, fd);
          setTask(res.data.task);
          onTaskUpdated(res.data.task);
          setPendingFiles([]);
        } else {
          const data: UpdateTaskData = {
            title,
            description,
            priority: priority as any,
            status: status as any,
            deadline: deadline?.toISOString(),
            category,
            estimatedHours,
            assigneeId: selectedAssigneeId,
          };
          const res = await api.updateTask(task.id, data);
          setTask(res.data.task);
          onTaskUpdated(res.data.task);
        }
        toast({ title: "Task updated" });
      }
    } catch (err: any) {
      if (err.message?.includes("403") || err.message?.includes("permission")) {
        toast({ title: "Permission denied", description: "You don't have permission to edit this task", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${f.name} exceeds 20MB`, variant: "destructive" });
        continue;
      }
      valid.push(f);
    }
    const total = pendingFiles.length + valid.length;
    if (total > MAX_FILES) {
      toast({ title: "Too many files", description: `Maximum ${MAX_FILES} attachments per upload`, variant: "destructive" });
      return;
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = async (att: TaskAttachment) => {
    try {
      await api.deleteTaskAttachment(att.id);
      setTask((prev) =>
        prev ? { ...prev, attachments: prev.attachments?.filter((a) => a.id !== att.id) } : prev
      );
      toast({ title: "Attachment removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      setDeleting(true);
      await api.deleteTask(task.id);
      toast({ title: "Task deleted" });
      onTaskDeleted(task.id);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="truncate pr-8">
              {loading ? "Loading..." : task?.title || "Task"}
            </SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                {isManager && <TabsTrigger value="assignees" className="text-xs">Assignees</TabsTrigger>}
                {isManager && <TabsTrigger value="attachments" className="text-xs">Files</TabsTrigger>}
                {isManager ? (
                  <TabsTrigger value="danger" className="text-xs text-destructive">Danger</TabsTrigger>
                ) : (
                  <TabsTrigger value="attachments" className="text-xs">Files</TabsTrigger>
                )}
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {isManager ? (
                  <>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deadline ? format(deadline, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Hours</Label>
                        <Input type="number" min={0} value={estimatedHours} onChange={(e) => setEstimatedHours(Number(e.target.value))} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* TeamMember: read-only summary + editable status/hours */}
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold">{task?.title}</h4>
                      {task?.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline">{task?.priority}</Badge>
                        <Badge variant="outline">{task?.category}</Badge>
                        {task?.deadline && <Badge variant="outline">Due {new Date(task.deadline).toLocaleDateString()}</Badge>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Actual Hours</Label>
                      <Input type="number" min={0} step={0.5} value={actualHours} onChange={(e) => setActualHours(Number(e.target.value))} />
                    </div>
                  </>
                )}

                <Button onClick={handleSaveDetails} disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </TabsContent>

              {/* Assignees Tab */}
              {isManager && (
                <TabsContent value="assignees" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assigned TeamMember</Label>
                    {task?.assignee && (
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{task.assignee.firstName} {task.assignee.lastName}</p>
                          {task.assignee.email && <p className="text-xs text-muted-foreground">{task.assignee.email}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setSelectedAssigneeId(null)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{task?.assignee ? "Reassign to" : "Assign to"}</Label>
                    {loadingAssistants ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading team_members...
                      </div>
                    ) : (
                      <Select
                        value={selectedAssigneeId || "unassigned"}
                        onValueChange={(v) => setSelectedAssigneeId(v === "unassigned" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an team_member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {team_members.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="flex items-center gap-2">
                                {a.firstName} {a.lastName}
                                {a.isAvailable && (
                                  <span className="inline-block w-2 h-2 rounded-full bg-success" />
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Button onClick={handleSaveDetails} disabled={saving} className="w-full">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Assignment
                  </Button>
                </TabsContent>
              )}

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="space-y-4">
                {/* Existing attachments */}
                {task?.attachments && task.attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Attachments</Label>
                    <div className="space-y-2">
                      {task.attachments.map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-2 border border-border rounded-lg">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{att.fileName}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            {isManager && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleRemoveAttachment(att)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload new (managers only) */}
                {isManager && (
                  <div className="space-y-2">
                    <Label>Upload New</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Select Files
                    </Button>
                    <p className="text-xs text-muted-foreground">Max 10 files, 20MB each</p>

                    {pendingFiles.length > 0 && (
                      <div className="space-y-1">
                        {pendingFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm truncate">{f.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button onClick={handleSaveDetails} disabled={saving} className="w-full mt-2">
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Upload & Save
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {!isManager && (!task?.attachments || task.attachments.length === 0) && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No attachments</p>
                )}
              </TabsContent>

              {/* Danger Zone Tab */}
              {isManager && (
                <TabsContent value="danger" className="space-y-4">
                  <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <h3 className="font-semibold">Danger Zone</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this task and all its attachments. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Task
                    </Button>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              Type <strong>DELETE</strong> to confirm. This will permanently remove the task and all data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== "DELETE" || deleting}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
