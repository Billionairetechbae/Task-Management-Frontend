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

import { User, Clock, X, Plus, Paperclip } from "lucide-react";
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
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // To reset file input

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
     File Handlers
  ======================= */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    
    // Check for duplicate file names
    const uniqueNewFiles = newFiles.filter(newFile => 
      !files.some(existingFile => 
        existingFile.name === newFile.name && 
        existingFile.size === newFile.size
      )
    );

    if (uniqueNewFiles.length !== newFiles.length) {
      toast({
        title: "Duplicate Files",
        description: "Some files were already added and were skipped.",
        variant: "default",
      });
    }

    if (uniqueNewFiles.length > 0) {
      setFiles((prev) => [...prev, ...uniqueNewFiles]);
    }

    // Reset file input to allow selecting same file again
    setFileInputKey(Date.now());
  };

  const removeAttachment = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllAttachments = () => {
    if (files.length === 0) return;
    
    if (confirm(`Remove all ${files.length} attachments?`)) {
      setFiles([]);
    }
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
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

      // Reset form
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
      setFileInputKey(Date.now());

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
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
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

            {/* Hidden file input */}
            <Input
              id="file-input"
              key={fileInputKey}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Add file button */}
            <div className="mb-3">
              <Button
                type="button"
                variant="outline"
                onClick={triggerFileInput}
                className="w-full flex items-center justify-center gap-2 border-dashed hover:bg-muted/50"
              >
                <Plus className="w-4 h-4" />
                Add Files
                <span className="text-xs text-muted-foreground ml-auto">
                  {files.length} file(s) selected
                </span>
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Click to browse or drag and drop files
              </p>
            </div>

            {/* File preview list */}
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
                        <p className="text-xs text-muted-foreground truncate">
                          Type: {file.type || "Unknown"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Image preview button */}
                        {file.type.startsWith("image") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(URL.createObjectURL(file), '_blank');
                            }}
                            title="Preview image"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Button>
                        )}

                        {/* Remove button */}
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

                {/* Add more files button at bottom */}
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
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button 
              type="submit" 
              disabled={loading}
              className="min-w-[100px]"
            >
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
    </Dialog>
  );
};

export default CreateTaskDialog;