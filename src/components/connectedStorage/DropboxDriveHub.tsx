import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, FolderOpen, Loader2 } from "lucide-react";
import { api, type Project, type Task } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ConnectedStorageAttachmentsSection } from "./ConnectedStorageAttachmentsSection";
import { Button } from "@/components/ui/button";
import { useWorkspaceGovernance } from "@/hooks/useWorkspaceGovernance";

const INTERNAL_ROLES = new Set(["owner", "admin", "manager", "member"]);
type Target = { type: "task" | "project"; id: string };

export default function DropboxDriveHub() {
  const { workspaceRole, user } = useAuth();
  const governance = useWorkspaceGovernance();
  const dropboxEnabled = governance.capabilities?.dropboxEnabled !== false;
  const { toast } = useToast();
  const internal = INTERNAL_ROLES.has(String(workspaceRole));
  const canConnect = workspaceRole === "owner" || workspaceRole === "admin";
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [targetKey, setTargetKey] = useState("");
  const [taskWritable, setTaskWritable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!internal) return;
    let live = true;
    setLoading(true);
    Promise.all([
      api.listConnectedStorageConnections(),
      api.getTasks({ limit: 50, page: 1 }),
      api.getProjects(),
    ]).then(([connectionResponse, taskResponse, projectResponse]) => {
      if (!live) return;
      setConnected(connectionResponse.data.connections.some((connection) => connection.provider === "dropbox" && connection.status === "active"));
      setTasks(taskResponse.data.tasks ?? []);
      setProjects((projectResponse.data as any)?.projects ?? []);
    }).catch((error: any) => {
      if (live) toast({ title: "Could not load Connected Storage", description: error?.message || "Try again later.", variant: "destructive" });
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [internal, toast]);

  const target: Target | null = useMemo(() => {
    const [type, id] = targetKey.split(":");
    return (type === "task" || type === "project") && id ? { type, id } : null;
  }, [targetKey]);
  const selectedTask = target?.type === "task" ? tasks.find((task) => String(task.id) === target.id) : undefined;
  const selectedProject = target?.type === "project" ? projects.find((project) => project.id === target.id) : undefined;
  const isManager = ["owner", "admin", "manager"].includes(String(workspaceRole));
  useEffect(() => {
    if (!selectedTask?.id) { setTaskWritable(null); return; }
    if (isManager) { setTaskWritable(true); return; }
    let live = true;
    setTaskWritable(null);
    api.getTaskById(String(selectedTask.id)).then((response) => {
      if (!live) return;
      const access = response.data.access;
      const assignedSubtask = Boolean(selectedTask.parentTaskId && (selectedTask.assigneeId === user?.id || selectedTask.assignees?.some((assignee) => assignee.id === user?.id)));
      setTaskWritable(Boolean(access?.canEdit || (access?.readOnly && assignedSubtask)));
    }).catch(() => { if (live) setTaskWritable(false); });
    return () => { live = false; };
  }, [selectedTask?.id, selectedTask?.parentTaskId, selectedTask?.assigneeId, selectedTask?.assignees, user?.id, isManager]);
  const projectWritable = Boolean(selectedProject && (isManager || (selectedProject.members as any[] | undefined)?.some((member) => member.id === user?.id && ["owner", "admin"].includes(member.ProjectMember?.role ?? member.role))));
  const canAttach = target?.type === "task" ? taskWritable === true : target?.type === "project" ? projectWritable : false;
  if (!internal) return <section className="rounded-xl border p-6 text-sm text-muted-foreground">Dropbox Connected Storage is available to internal workspace members only.</section>;
  if (!dropboxEnabled) return <section role="status" className="rounded-xl border p-6 text-sm text-muted-foreground">Dropbox Connected Storage is disabled by your workspace administrator. Existing Dropbox files and stored references are not deleted.</section>;

  return <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
    <header className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700"><Cloud className="h-5 w-5" /></span>
      <div><h2 className="font-semibold">Dropbox Connected Storage</h2><p className="mt-1 text-sm text-muted-foreground">Dropbox is a workspace connection. Files stay in Dropbox; Admiino stores references when you attach them to work.</p></div>
    </header>
    {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking workspace connection…</p>
      : connected === false ? <div className="rounded-lg border border-dashed p-5"><p className="font-medium">Dropbox is not connected for this workspace.</p><p className="mt-1 text-sm text-muted-foreground">{canConnect ? "Connect a workspace Dropbox account to browse and attach files." : "Ask a workspace owner or admin to connect Dropbox."}</p>{canConnect && <Button asChild className="mt-3"><Link to="/settings/integrations">Connect Dropbox</Link></Button>}</div>
      : <>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="space-y-1.5 text-sm font-medium">Choose a task or project
            <select value={targetKey} onChange={(event) => setTargetKey(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal">
              <option value="">Choose where to browse and attach files</option>
              {projects.length > 0 && <optgroup label="Projects">{projects.map((project) => <option key={`project:${project.id}`} value={`project:${project.id}`}>{project.name}</option>)}</optgroup>}
              {tasks.length > 0 && <optgroup label="Tasks">{tasks.map((task) => <option key={`task:${task.id}`} value={`task:${task.id}`}>{task.title || "Untitled task"}</option>)}</optgroup>}
            </select>
          </label>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><FolderOpen className="h-4 w-4" />Original files remain in Dropbox</span>
        </div>
        {target && canAttach && <ConnectedStorageAttachmentsSection key={`${target.type}:${target.id}`} targetType={target.type} targetId={target.id} canAttach initialAttachments={[]} title="Files attached from Dropbox" />}
        {target && !canAttach && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">You can view this item only. Choose a task or project you can edit to browse and attach Dropbox files.</p>}
        {!target && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Select a task or project to securely browse files for that item. Admiino checks your access to the selected work before each request.</p>}
        {!projects.length && !tasks.length && !loading && <p className="text-xs text-muted-foreground">No accessible workspace tasks or projects are available to select.</p>}
      </>}
  </section>;
}
