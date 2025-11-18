import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, Assistant } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { User, Clock } from "lucide-react";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateTaskDialog = ({ open, onOpenChange, onSuccess }: CreateTaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    deadline: "",
    category: "",
    estimatedHours: 0,
    assigneeId: "",
  });

  // Fetch verified assistants
  useEffect(() => {
    if (open) fetchCompanyAssistants();
  }, [open]);

  const fetchCompanyAssistants = async () => {
    try {
      setAssistantsLoading(true);
      const response = await api.getCompanyAssistants();

      const validAssistants = response.data.assistants.filter(
        (assistant: Assistant) =>
          assistant.id &&
          assistant.id.trim() !== "" &&
          assistant.isVerified // Only verified assistants can be assigned
      );

      setAssistants(validAssistants);
    } catch (error) {
      console.error("Failed to fetch assistants:", error);
      toast({
        title: "Error",
        description: "Failed to load assistants",
        variant: "destructive",
      });
    } finally {
      setAssistantsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.deadline || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
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
      form.append("estimatedHours", formData.estimatedHours.toString());

      if (formData.assigneeId) {
        form.append("assigneeId", formData.assigneeId);
      }

      // Append files
      files.forEach((file) => {
        form.append("files", file);
      });

      await api.createTask(form);

      toast({
        title: "Success",
        description: formData.assigneeId
          ? "Task created and assigned successfully!"
          : "Task created successfully!",
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

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delegate New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task"
              rows={4}
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <Label>Attachments (Optional)</Label>
            <Input type="file" multiple onChange={handleFileChange} className="mt-2" />

            {files.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p className="font-medium mb-1">Selected Files:</p>
                <ul className="pl-4 list-disc">
                  {files.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Operations"
                required
              />
            </div>

            <div>
              <Label>Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "low" | "medium" | "high") =>
                  setFormData({ ...formData, priority: value })
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          {/* Assistant Assignment */}
          <div>
            <Label htmlFor="assigneeId">Assign to Assistant (Optional)</Label>

            {assistantsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="w-4 h-4 animate-spin" /> Loading assistants...
              </div>
            ) : assistants.length === 0 ? (
              <div className="text-sm text-muted-foreground mt-2 border border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No verified assistants available</p>
              </div>
            ) : (
              <Select
                value={formData.assigneeId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, assigneeId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select an assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      {assistant.firstName} {assistant.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
