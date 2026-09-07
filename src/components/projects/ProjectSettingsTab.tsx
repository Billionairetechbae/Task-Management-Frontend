import { useState } from "react";
import { Project, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ProjectSettingsTabProps {
  project: Project;
  onRefresh: () => void;
  isCompact?: boolean;
}

const ProjectSettingsTab = ({ project, onRefresh, isCompact = false }: ProjectSettingsTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { workspaceRole, activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canDelete = workspaceRole === "owner" || workspaceRole === "admin" || workspaceRole === "manager";
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || "",
    startDate: project.startDate ? project.startDate.split("T")[0] : "",
    endDate: project.endDate ? project.endDate.split("T")[0] : "",
    status: project.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      await api.updateProject(project.id, {
        name: formData.name,
        description: formData.description,
        status: formData.status as any,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      });

      toast({ title: "Project updated successfully" });
      onRefresh();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteProject(project.id);
      await queryClient.invalidateQueries({ queryKey: ["projects", activeCompanyId] });
      await queryClient.invalidateQueries({ queryKey: ["trash", activeCompanyId] });
      toast({ title: "Project moved to Trash." });
      navigate("/projects", { replace: true });
    } catch (err: any) {
      toast({ title: "Unable to delete project", description: err?.statusCode === 403 ? "You don't have permission to perform this action." : "We couldn't complete this action. Please try again.", variant: "destructive" });
    } finally { setDeleting(false); }
  };

  if (isCompact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-[10px] uppercase font-bold text-muted-foreground">Project Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-8 text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-[10px] uppercase font-bold text-muted-foreground">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="text-xs min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="startDate" className="text-[10px] uppercase font-bold text-muted-foreground">Start</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="h-8 text-xs px-2"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate" className="text-[10px] uppercase font-bold text-muted-foreground">End</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="h-8 text-xs px-2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="status" className="text-[10px] uppercase font-bold text-muted-foreground">Status</Label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-8 text-xs gap-2">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Changes
        </Button>
      </form>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card className="border border-border shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="What is this project about?"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {canDelete && <Card className="mt-6 border-destructive/40"><CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Move this project and its active tasks/files to Trash for 30 days.</p><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete project</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move project to Trash?</AlertDialogTitle><AlertDialogDescription>This project and its active tasks/files will be removed from the workspace and kept in Trash for 30 days.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></CardContent></Card>}
    </div>
  );
};

export default ProjectSettingsTab;
