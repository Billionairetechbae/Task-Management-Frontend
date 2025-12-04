import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { api, Assistant } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { User, Clock, X } from "lucide-react";
import { getFileIcon } from "@/utils/fileIcons";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateTaskDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateTaskDialogProps) => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    deadline: "",
    category: "",
    estimatedHours: 0,
    assigneeId: "",
  });

  /* =======================
     Load Assistants
  ======================= */
  useEffect(() => {
    if (open) fetchAssistants();
  }, [open]);

  const fetchAssistants = async () => {
    try {
      setAssistantsLoading(true);

      const res = await api.getCompanyAssistants();
      const list = res.data.assistants.filter((a) => a.isVerified);

      setAssistants(list);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assistants",
        variant: "destructive",
      });
    } finally {
      setAssistantsLoading(false);
    }
  };

  /* =======================
     File Handler
  ======================= */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeAttachment = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* =======================
     Submit
  ======================= */
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

      const form = new FormData();
      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("priority", formData.priority);
      form.append("deadline", new Date(formData.deadline).toISOString());
      form.append("category", formData.category);
      form.append("estimatedHours", String(formData.estimatedHours));

      if (formData.assigneeId) {
        form.append("assigneeId", formData.assigneeId);
      }

      files.forEach((file) => form.append("files", file));

      await api.createTask(form);

      toast({
        title: "Task Created",
        description: "Your task was created successfully.",
      });

      setFormData({
        title: "",
        description: "",
        priority: "medium",
        deadline: "",
        category: "",
        estimatedHours: 0,
        assigneeId: "",
      });
      setFiles([]);

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

  /* =======================
     UI
  ======================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95%] sm:w-[90%] max-h-[90vh] overflow-y-auto rounded-xl p-6">

        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            Create New Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Task Title */}
          <div>
            <Label>Task Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description *</Label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the task..."
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <Label>Attachments (Optional)</Label>
            <Input type="file" multiple onChange={handleFileChange} />

            {files.length > 0 && (
              <div className="mt-3 space-y-3 max-h-48 overflow-y-auto">
                {files.map((file, idx) => {
                  const Icon = getFileIcon(file.type, file.name);

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/40"
                    >
                      <Icon className="w-6 h-6 text-primary" />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {/* Thumbnail for images */}
                        {file.type.startsWith("image") && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className="mt-2 w-24 h-16 object-cover rounded-md border"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-destructive hover:opacity-70"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Documentation"
                required
              />
            </div>

            <div>
              <Label>Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(v: any) =>
                  setFormData({ ...formData, priority: v })
                }
              >
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

          {/* Deadline + Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Deadline *</Label>
              <Input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedHours: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Assistant Assignment */}
          <div>
            <Label>Assign to Assistant (Optional)</Label>

            {assistantsLoading ? (
              <div className="text-sm flex items-center gap-2 opacity-70 mt-2">
                <Clock className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : assistants.length === 0 ? (
              <div className="text-sm text-muted-foreground mt-2 border border-dashed rounded-lg p-4 text-center">
                <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No verified assistants available
              </div>
            ) : (
              <Select
                value={formData.assigneeId || "none"}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    assigneeId: v === "none" ? "" : v,
                  })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assistants.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
