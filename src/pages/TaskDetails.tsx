import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { X, Send, Clock, User2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { getFileIcon } from "@/utils/fileIcons";
import AttachmentPreview from "@/components/AttachmentPreview";

const TaskDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [updating, setUpdating] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.getTaskById(id);
      setTask(response.data.task);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load task details",
        variant: "destructive",
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      setUpdating(true);
      await api.updateTask(task.id, { status: newStatus as any });
      toast({ title: "Success", description: "Task status updated" });
      fetchTask();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const STATUS_LABEL = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const PRIORITY_COLORS = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading task…
      </div>
    );
  }

  if (!task) return null;

  return (
    <>
      {/* Preview Modal */}
      {preview && (
        <AttachmentPreview
          url={preview.url}
          type={preview.type}
          name={preview.name}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Main Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* HEADER */}
          <div className="p-6 border-b flex justify-between items-start">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-bold">{task.title}</h1>

              <div className="flex gap-3 flex-wrap">
                <Badge className={`px-3 py-1 ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority.toUpperCase()}
                </Badge>

                <Badge className={`px-3 py-1 ${STATUS_COLORS[task.status]}`}>
                  {STATUS_LABEL[task.status]}
                </Badge>
              </div>
            </div>

            <Button variant="ghost" onClick={() => navigate(-1)}>
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* DETAILS AREA */}
          <div className="p-6 overflow-y-auto space-y-6">

            {/* GRID INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-semibold">{task.category}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="font-semibold">
                  {new Date(task.deadline).toLocaleString()}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">
                  {user?.role === "assistant"
                    ? "Assigned By Executive"
                    : "Assigned Assistant"}
                </p>
                <div className="flex items-center gap-2 font-semibold">
                  <User2 className="w-4 h-4 text-primary" />
                  {user?.role === "assistant"
                    ? `${task.creator?.firstName} ${task.creator?.lastName}`
                    : task.assignee
                    ? `${task.assignee.firstName} ${task.assignee.lastName}`
                    : "Unassigned"}
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Hours</p>
                <p className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {task.actualHours
                    ? `${task.actualHours}h (actual)`
                    : "No actual hours"}{" "}
                  • {task.estimatedHours}h estimated
                </p>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed">{task.description}</p>
            </div>

            {/* ATTACHMENTS */}
            {task.attachments && task.attachments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Attachments</h3>

                <div className="grid gap-3">
                  {task.attachments.map((file) => {
                    const Icon = getFileIcon(file.fileType, file.fileName);

                    return (
                      <div
                        key={file.id}
                        className="p-3 border rounded-lg flex gap-4 hover:bg-muted transition cursor-pointer"
                        onClick={() =>
                          setPreview({
                            url: file.fileUrl,
                            type: file.fileType,
                            name: file.fileName,
                          })
                        }
                      >
                        {/* ICON */}
                        <Icon className="w-8 h-8 text-primary" />

                        {/* DETAILS */}
                        <div className="flex-1">
                          <p className="font-semibold">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileType}
                          </p>
                        </div>

                        {/* DOWNLOAD BUTTON */}
                        <a
                          href={file.fileUrl}
                          download={file.fileName}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary underline text-sm"
                        >
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STATUS UPDATE */}
            {user?.role === "assistant" && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Update Status</p>

                <Select
                  value={task.status}
                  onValueChange={handleStatusChange}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* COMMENT BOX */}
          <div className="p-6 border-t bg-muted/40">
            <div className="flex gap-3">
              <Textarea
                placeholder="Add a comment..."
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1"
              />
              <Button size="icon" disabled={!newComment.trim()}>
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetails;
