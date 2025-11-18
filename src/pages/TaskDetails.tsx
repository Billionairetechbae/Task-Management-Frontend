import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X,
  Send,
  Clock,
  File,
  FileImage,
  FileText,
  Folder,
  User2,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const TaskDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [updating, setUpdating] = useState(false);

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
      await api.updateTask(task.id, {
        status: newStatus as "pending" | "in_progress" | "completed" | "cancelled",
      });

      toast({ title: "Success", description: "Task status updated successfully" });
      fetchTask();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  // ✔ FIX: Replace invalid Badge variants with classes
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-300";
      default:
        return "bg-blue-100 text-blue-800 border border-blue-300";
    }
  };

  const PRIORITY_COLORS: Record<string, string> = {
    low: "bg-blue-100 text-blue-800 border border-blue-300",
    medium: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    high: "bg-orange-100 text-orange-800 border border-orange-300",
    urgent: "bg-red-100 text-red-800 border border-red-300",
  };

  const getAttachmentIcon = (type: string) => {
    if (type.includes("image")) return <FileImage className="w-6 h-6 text-blue-500" />;
    if (type.includes("pdf")) return <FileText className="w-6 h-6 text-red-500" />;
    if (type.includes("word") || type.includes("doc")) return <FileText className="w-6 h-6 text-blue-700" />;
    if (type.includes("sheet") || type.includes("excel") || type.includes("xls")) return <FileText className="w-6 h-6 text-green-700" />;
    if (type.includes("zip") || type.includes("compressed")) return <Folder className="w-6 h-6 text-yellow-600" />;
    return <File className="w-6 h-6 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading task details...
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">

        {/* HEADER */}
        <div className="p-6 border-b border-border flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{task.title}</h1>

            <div className="flex items-center gap-3">
              <Badge className={`px-3 py-1 ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority.toUpperCase()}
              </Badge>

              <Badge className={`px-3 py-1 ${getStatusBadgeClass(task.status)}`}>
                {STATUS_LABEL[task.status]}
              </Badge>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* DETAILS */}
        <div className="p-6 space-y-6 border-b border-border overflow-y-auto">

          {/* INFO GRID */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-semibold">{task.category}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Deadline</p>
              <p className="font-semibold">
                {new Date(task.deadline).toLocaleDateString()}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">
                {user?.role === "executive" ? "Assigned Assistant" : "Client Executive"}
              </p>
              <p className="flex items-center gap-2 font-semibold">
                <User2 className="w-4 h-4 text-primary" />
                {user?.role === "executive"
                  ? task.assignee
                    ? `${task.assignee.firstName} ${task.assignee.lastName}`
                    : "Unassigned"
                  : `${task.executive?.firstName} ${task.executive?.lastName}`}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Hours</p>
              <p className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {task.actualHours ? `${task.actualHours}h actual` : "No actuals"} •{" "}
                {task.estimatedHours}h estimated
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
              <div className="space-y-3">

                {task.attachments.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.fileUrl}
                    download={file.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition"
                  >
                    {getAttachmentIcon(file.fileType)}

                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{file.fileName}</span>
                      <span className="text-xs text-muted-foreground">{file.fileType}</span>
                    </div>
                  </a>
                ))}
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
                <SelectTrigger className="w-full">
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

        {/* ACTIVITY FEED */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-3">Activity Feed</h3>

          <div className="bg-muted p-4 rounded-lg flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">
              {task.executive?.firstName?.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {task.executive?.firstName} {task.executive?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(task.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Task created</p>
            </div>
          </div>
        </div>

        {/* COMMENTS */}
        <div className="p-6 border-t border-border bg-muted/50">
          <div className="flex gap-3">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
              rows={2}
            />
            <Button size="icon" disabled={!newComment.trim()}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TaskDetails;
