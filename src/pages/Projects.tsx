import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Info } from "lucide-react";

export default function Projects() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getProjects();
      const arr = (res as any)?.data?.projects || (res as any)?.projects || (res as any)?.data || [];
      const list = Array.isArray(arr) ? arr : [];
      setProjects(list);
      
      // Only redirect if there are projects AND we are not explicitly on the projects page to create one
      // We can check if the URL has a hash or query param if we wanted to be specific, 
      // but for now let's just only redirect if it's the very first load and we aren't "creating"
      const searchParams = new URLSearchParams(window.location.search);
      const isCreating = searchParams.get("create") === "true";

      if (list.length > 0 && !isCreating) {
        navigate(`/projects/${list[0].id}`);
      }
    } catch (err: any) {
      toast({ title: "Failed to load projects", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      await api.createProject({ name });
      setName("");
      await load();
      toast({ title: "Project created" });
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Create Your First Project</h1>
          <p className="text-muted-foreground">Get started by giving your project a name and description.</p>
        </div>

        <Card className="p-6 border-border shadow-soft max-w-md mx-auto animate-slide-up">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Project Name</label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Website Redesign" 
                className="h-11"
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </div>
            <Button 
              className="w-full h-11 text-base font-bold gap-2" 
              onClick={create} 
              disabled={creating || !name.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center mt-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse font-medium">Setting up your workspace...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

