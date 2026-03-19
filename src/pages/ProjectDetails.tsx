import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, Project, Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ProjectDetails() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberAdding, setMemberAdding] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getProjectById(id);
      const p = (res as any)?.data?.project || (res as any)?.project;
      setProject(p || null);
    } catch (err: any) {
      toast({ title: "Failed to load project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!id || !memberUserId.trim()) return;
    try {
      setMemberAdding(true);
      await api.addProjectMember(id, memberUserId, "member");
      setMemberUserId("");
      await load();
      toast({ title: "Member added" });
    } catch (err: any) {
      toast({ title: "Add failed", description: err.message, variant: "destructive" });
    } finally {
      setMemberAdding(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {!loading && !project && <p className="text-muted-foreground">Project not found</p>}
        {!loading && project && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-sm text-muted-foreground capitalize">{project.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-4 border border-border md:col-span-2">
                <h2 className="font-semibold mb-3">Tasks</h2>
                {project.tasks && project.tasks.length > 0 ? (
                  <div className="space-y-3">
                    {project.tasks.map((t: Task) => (
                      <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{t.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No tasks linked</p>
                )}
              </Card>

              <Card className="p-4 border border-border">
                <h2 className="font-semibold mb-3">Members</h2>
                {project.members && project.members.length > 0 ? (
                  <ul className="space-y-2">
                    {project.members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">{m.user?.firstName} {m.user?.lastName}</span>
                          <span className="text-muted-foreground ml-2 capitalize">{m.role}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No members</p>
                )}

                <div className="mt-4 flex gap-2">
                  <Input value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} placeholder="User ID to add" />
                  <Button onClick={addMember} disabled={memberAdding || !memberUserId.trim()}>Add</Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

