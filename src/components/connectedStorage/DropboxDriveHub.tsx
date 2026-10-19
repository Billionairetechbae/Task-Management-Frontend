import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, FolderOpen, Loader2 } from "lucide-react";
import { ResourcePicker, type PickerTarget } from "./ResourcePicker";
import { api, type Project, type Task } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ConnectedStorageAttachmentsSection } from "./ConnectedStorageAttachmentsSection";
import { Button } from "@/components/ui/button";
import { useWorkspaceGovernance } from "@/hooks/useWorkspaceGovernance";

const INTERNAL_ROLES = new Set(["owner", "admin", "manager", "member"]);

export default function DropboxDriveHub() {
  const { workspaceRole, user, activeCompanyId } = useAuth();
  const governance = useWorkspaceGovernance();
  const dropboxEnabled = governance.capabilities?.dropboxEnabled !== false;
  const { toast } = useToast();
  const internal = INTERNAL_ROLES.has(String(workspaceRole));
  const canConnect = workspaceRole === "owner" || workspaceRole === "admin";
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [target, setTarget] = useState<PickerTarget | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const knownTasks = useRef(new Map<string, Task>());
  const taskRequest = useRef(0);
  const [taskWritable, setTaskWritable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!internal) return;
    let live = true;
    // A different workspace means different connections, projects and tasks: start clean.
    setTarget(null); setTasks([]); setProjects([]); setConnected(null); knownTasks.current.clear();
    setLoading(true);
    Promise.all([
      api.listConnectedStorageConnections(),
      api.getTasks({ limit: 50, page: 1 }),
      api.getProjects(),
    ]).then(([connectionResponse, taskResponse, projectResponse]) => {
      if (!live) return;
      setConnected(connectionResponse.data.connections.some((connection) => connection.provider === "dropbox" && connection.status === "active"));
      const initial = taskResponse.data.tasks ?? [];
      initial.forEach((task) => task.id && knownTasks.current.set(String(task.id), task));
      setTasks(initial);
      setProjects((projectResponse.data as any)?.projects ?? []);
    }).catch((error: any) => {
      if (live) toast({ title: "Could not load Connected Storage", description: error?.message || "Try again later.", variant: "destructive" });
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [internal, toast, activeCompanyId]);

  // Task lists are searched on the server (bounded, already filtered to what this user may see), never loaded in bulk.
  const searchTasks = useCallback(({ q, projectId }: { q: string; projectId: string | null }) => {
    const request = ++taskRequest.current;
    setTasksLoading(true);
    api.getTasks({ limit: 25, page: 1, ...(q ? { q } : {}), ...(projectId ? { projectId } : {}) }).then((response) => {
      if (request !== taskRequest.current) return;
      const found = response.data.tasks ?? [];
      found.forEach((task) => task.id && knownTasks.current.set(String(task.id), task));
      setTasks(found);
    }).catch(() => { if (request === taskRequest.current) setTasks([]); }).finally(() => { if (request === taskRequest.current) setTasksLoading(false); });
  }, []);
  const taskProjectId = (task: Task): string | null => (task as any).projectId ?? null;
  const taskName = (task: Task) => (task as any).project?.name ?? null;
  const pickerTasks = useMemo(() => tasks.filter((task) => task.id && !task.parentTaskId).map((task) => ({ id: String(task.id), title: task.title || "Untitled task", projectId: taskProjectId(task), projectName: taskName(task) ?? projects.find((project) => project.id === taskProjectId(task))?.name ?? null })), [tasks, projects]);
  const pickerProjects = useMemo(() => projects.map((project) => ({ id: project.id, name: project.name })), [projects]);
  const selectedTask = target?.type === "task" ? knownTasks.current.get(target.id) ?? tasks.find((task) => String(task.id) === target.id) : undefined;
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <ResourcePicker projects={pickerProjects} tasks={pickerTasks} value={target} onChange={setTarget} onTaskQuery={searchTasks} tasksLoading={tasksLoading} loading={loading}
            selectedLabel={target?.type === "task" ? selectedTask?.title : target?.type === "project" ? selectedProject?.name : null} />
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><FolderOpen className="h-4 w-4" />Original files remain in Dropbox</span>
        </div>
        {target && canAttach && <ConnectedStorageAttachmentsSection key={`${target.type}:${target.id}`} targetType={target.type} targetId={target.id} canAttach initialAttachments={[]} title="Files attached from Dropbox" />}
        {target && !canAttach && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">You can view this item only. Choose a task or project you can edit to browse and attach Dropbox files.</p>}
        {!target && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Select a task or project to securely browse files for that item. Admiino checks your access to the selected work before each request.</p>}
        {!projects.length && !tasks.length && !loading && <p className="text-xs text-muted-foreground">No accessible workspace tasks or projects are available to select.</p>}
      </>}
  </section>;
}
