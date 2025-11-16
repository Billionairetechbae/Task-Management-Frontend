import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Clock } from "lucide-react";
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
      // Use the new getTaskById function
      const response = await api.getTaskById(id);
      setTask(response.data.task);
    } catch (error: any) {
      console.error('Failed to fetch task:', error);
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
        status: newStatus as 'pending' | 'in_progress' | 'completed' | 'cancelled',
      });
      
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
      
      fetchTask(); // Refresh task data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  };

  const getPriorityDisplay = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading task details...</p>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">{task.title}</h2>
            <Badge
              variant={task.status === "in_progress" ? "default" : "secondary"}
              className={
                task.status === "pending"
                  ? "bg-warning text-warning-foreground"
                  : task.status === "completed"
                  ? "bg-success text-success-foreground"
                  : ""
              }
            >
              {getStatusDisplay(task.status)}
            </Badge>
          </div>
          {/* FIXED: Use navigate(-1) instead of hardcoded path */}
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 border-b border-border">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{task.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge
                variant={task.priority === "high" ? "destructive" : "secondary"}
                className={
                  task.priority === "medium"
                    ? "bg-warning/10 text-warning border-warning/20"
                    : ""
                }
              >
                {getPriorityDisplay(task.priority)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deadline</p>
              <p className="font-medium">{new Date(task.deadline).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {user?.role === 'executive' ? 'Assigned To' : 'Client'}
              </p>
              <p className="font-medium">
                {user?.role === 'executive'
                  ? task.assignee
                    ? `${task.assignee.firstName} ${task.assignee.lastName}`
                    : 'Unassigned'
                  : task.executive
                  ? `${task.executive.firstName} ${task.executive.lastName}`
                  : 'Unknown'}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium">{task.description}</p>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              Actual Hours: {task.actualHours ? `${task.actualHours} hours` : 'Not logged'}
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="font-medium">
              Estimated: {task.estimatedHours} hours
            </span>
          </div>

          {user?.role === 'assistant' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Update Status</label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={updating}>
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

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-semibold mb-4">Activity Feed</h3>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {task.executive?.firstName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {task.executive?.firstName} {task.executive?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">Task created</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
            <Textarea
              placeholder="Add a comment or update..."
              className="flex-1"
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
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