// src/pages/TaskDetailsDebug.tsx
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const TaskDetailsDebug = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("TaskDetailsDebug: Component mounted with ID:", id);
    
    const fetchTask = async () => {
      if (!id) {
        setError("No task ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching task with ID:", id);
        setLoading(true);
        const response = await api.getTaskById(id);
        console.log("Task fetched successfully:", response.data.task);
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching task:", error);
        setError(error.message || "Failed to load task");
        setLoading(false);
        toast({
          title: "Error",
          description: error.message || "Failed to load task details",
          variant: "destructive",
        });
      }
    };

    fetchTask();
  }, [id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border rounded-xl p-6">
          <p>Loading task {id}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-red-500">Error: {error}</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-start">
          <h1 className="text-2xl font-bold">Task Details Debug</h1>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <X className="w-6 h-6" />
          </Button>
        </div>
        <div className="p-6">
          <p>Task ID: {id}</p>
          <p>Component is working!</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsDebug;