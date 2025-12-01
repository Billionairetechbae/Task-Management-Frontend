import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Search,
  Trash2,
  User,
  Building2,
} from "lucide-react";

const AdminTasks = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState("");
  const [priorityFilter, setPriority] = useState("");

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await api.adminGetTasks({
        status: statusFilter,
        priority: priorityFilter,
      });

      // client-side search improvement
      const filtered = search
        ? response.data.tasks.filter((t: any) =>
            t.title.toLowerCase().includes(search.toLowerCase())
          )
        : response.data.tasks;

      setTasks(filtered);
    } catch (err: any) {
      toast({
        title: "Failed to load tasks",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task permanently?")) return;
    try {
      await api.adminDeleteTask(id);
      toast({ title: "Task deleted" });
      loadTasks();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message });
    }
  };

  return (
    <div className="p-6 min-h-screen bg-background">
      <h2 className="text-3xl font-bold flex items-center gap-2 mb-8">
        <Briefcase className="w-8 h-8 text-primary" />
        Manage Tasks
      </h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full md:w-1/3">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadTasks()}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-3 py-2 rounded-lg bg-card"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriority(e.target.value)}
          className="border px-3 py-2 rounded-lg bg-card"
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <Button onClick={loadTasks}>Apply Filters</Button>
      </div>

      {/* Tasks Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6">
                  No tasks found.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr className="border-t border-border" key={task.id}>
                  <td className="px-4 py-4">{task.title}</td>

                  <td className="px-4 py-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {task.company?.name || "—"}
                  </td>

                  <td className="px-4 py-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {task.creator?.firstName} {task.creator?.lastName}
                  </td>

                  <td className="px-4 py-4">
                    {task.assignee
                      ? `${task.assignee.firstName} ${task.assignee.lastName}`
                      : "—"}
                  </td>

                  <td className="px-4 py-4 capitalize">{task.status}</td>
                  <td className="px-4 py-4 capitalize">{task.priority}</td>

                  <td className="px-4 py-4">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTasks;
