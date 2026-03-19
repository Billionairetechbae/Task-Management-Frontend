import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function Projects() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getProjects();
      const arr = (res as any)?.data?.projects || (res as any)?.projects || (res as any)?.data || [];
      setProjects(Array.isArray(arr) ? arr : []);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" />
          <Button onClick={create} disabled={creating || !name.trim()}>Create</Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-muted-foreground">No projects yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card key={p.id} className="p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{p.status}</p>
                  </div>
                  <Link to={`/projects/${p.id}`} className="text-primary hover:underline">Open</Link>
                </div>
                {p.description && <p className="text-sm mt-2 line-clamp-2">{p.description}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

