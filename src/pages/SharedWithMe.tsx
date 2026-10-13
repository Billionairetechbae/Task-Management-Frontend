import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, ClientViewPayload } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FolderKanban, ListChecks } from "lucide-react";

export default function SharedWithMe() {
  const { resourceType, resourceId } = useParams<{ resourceType: "project" | "task"; resourceId: string }>();
  const [resources, setResources] = useState<Array<{ id: string; resourceType: "project" | "task"; resourceId: string; accessLevel: string; grantedAt?: string | null; title: string }>>([]);
  const [data, setData] = useState<(ClientViewPayload & { accessLevel: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (resourceType && resourceId) {
          const result = await api.getAuthenticatedSharedResource(resourceType, resourceId);
          setData(result.data);
        } else {
          const result = await api.getSharedWithMe();
          setResources(result.data.resources);
        }
      } finally { setLoading(false); }
    })();
  }, [resourceType, resourceId]);

  if (loading) return <DashboardLayout><div className="py-16 flex justify-center"><Loader2 className="animate-spin" /></div></DashboardLayout>;
  if (data) {
    const isProject = data.resourceType === "project";
    const item: any = isProject ? data.project : data.task;
    const entries = isProject ? item.tasks : item.subtasks;
    return <DashboardLayout><div className="space-y-6 max-w-4xl"><div><p className="text-sm text-muted-foreground">Shared with me · {data.accessLevel}</p><h1 className="text-2xl font-bold">{item.name || item.title}</h1></div><Card><CardContent className="pt-6 space-y-3"><Badge variant="outline">{item.status || "active"}</Badge>{item.description && <p className="whitespace-pre-wrap">{item.description}</p>}</CardContent></Card><Card><CardHeader><CardTitle>{isProject ? "Shared project tasks" : "Shared subtasks"}</CardTitle></CardHeader><CardContent>{entries?.length ? <ul className="space-y-2">{entries.map((entry: any, index: number) => <li key={index} className="border rounded p-3"><strong>{entry.title}</strong><span className="ml-2 text-sm text-muted-foreground">{entry.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No items to display.</p>}</CardContent></Card></div></DashboardLayout>;
  }
  return <DashboardLayout><div className="space-y-6"><div><p className="text-sm text-muted-foreground">Resource-scoped client access</p><h1 className="text-2xl font-bold">Shared with Me</h1></div>{resources.length ? <div className="grid gap-3">{resources.map((resource) => <Link key={resource.id} to={`/shared-with-me/${resource.resourceType}/${resource.resourceId}`}><Card className="hover:border-primary"><CardContent className="pt-5 flex gap-3 items-center">{resource.resourceType === "project" ? <FolderKanban /> : <ListChecks />}<div><p className="font-medium">{resource.title}</p><p className="text-sm text-muted-foreground capitalize">{resource.resourceType} · {resource.accessLevel}</p></div></CardContent></Card></Link>)}</div> : <Card><CardContent className="py-12 text-center text-muted-foreground">No active shared resources.</CardContent></Card>}</div></DashboardLayout>;
}
