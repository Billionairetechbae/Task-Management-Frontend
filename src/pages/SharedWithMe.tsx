import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  api,
  ClientAccessCapabilities,
  ClientAccessLevel,
  ClientViewPayload,
  ClientViewResourceType,
  SharedTaskComment,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FolderKanban, ListChecks, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

type SharedPayload = ClientViewPayload & { accessLevel: ClientAccessLevel; capabilities: ClientAccessCapabilities };

// Mirrors CLIENT_ALLOWED_TASK_STATUSES on the backend; the backend is authoritative.
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "completed", label: "Completed" },
];

const statusLabel = (status?: string | null) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || (status ? status.replace(/_/g, " ") : "—");

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : null);

function StatusControl({ status, editable, busy, onChange }: {
  status?: string | null;
  editable: boolean;
  busy: boolean;
  onChange: (status: string) => void;
}) {
  if (!editable) return <Badge variant="outline" className="capitalize">{statusLabel(status)}</Badge>;
  const options = STATUS_OPTIONS.some((option) => option.value === status)
    ? STATUS_OPTIONS
    : [...STATUS_OPTIONS, { value: status || "", label: statusLabel(status) }];
  return (
    <Select value={status || ""} onValueChange={onChange} disabled={busy}>
      <SelectTrigger className="h-8 w-[140px]" aria-label="Task status"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TaskDiscussion({ resourceType, resourceId, taskId, canComment }: {
  resourceType: ClientViewResourceType;
  resourceId: string;
  taskId: string;
  canComment: boolean;
}) {
  const { toast } = useToast();
  const [comments, setComments] = useState<SharedTaskComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<SharedTaskComment | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getSharedTaskComments(resourceType, resourceId, taskId)
      .then((result) => { if (!cancelled) setComments(result.data.comments); })
      .catch(() => { if (!cancelled) setComments([]); });
    return () => { cancelled = true; };
  }, [resourceType, resourceId, taskId]);

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      const result = await api.addSharedTaskComment(resourceType, resourceId, taskId, {
        content,
        ...(replyTo ? { parentCommentId: replyTo.id } : {}),
      });
      setComments((items) => [...(items || []), result.data.comment]);
      setDraft("");
      setReplyTo(null);
    } catch (e: any) {
      toast({ title: "Could not post comment", description: e?.message || "Please try again", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 border-t pt-3">
      {comments === null ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className={`rounded border p-2 text-sm ${comment.parentCommentId ? "ml-6" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{comment.isMine ? "You" : comment.author}</span>
                <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap mt-1">{comment.content}</p>
              {canComment && !comment.parentCommentId && (
                <Button variant="link" size="sm" className="h-auto p-0 mt-1" onClick={() => setReplyTo(comment)}>Reply</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canComment && (
        <div className="space-y-2">
          {replyTo && (
            <p className="text-xs text-muted-foreground">
              Replying to {replyTo.isMine ? "yourself" : replyTo.author} ·{" "}
              <button type="button" className="underline" onClick={() => setReplyTo(null)}>cancel</button>
            </p>
          )}
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a comment…" maxLength={5000} rows={2} />
          <Button size="sm" onClick={send} disabled={sending || !draft.trim()}>
            {sending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Comment
          </Button>
        </div>
      )}
    </div>
  );
}

interface TaskRowProps {
  entry: { id?: string; title: string; status?: string | null; priority?: string | null; deadline?: string | null; assignee?: string | null };
  resourceType: ClientViewResourceType;
  resourceId: string;
  capabilities: ClientAccessCapabilities;
  busy: boolean;
  onStatusChange: (taskId: string, status: string) => void;
}

function TaskRow({ entry, resourceType, resourceId, capabilities, busy, onStatusChange }: TaskRowProps) {
  const [open, setOpen] = useState(false);
  const deadline = formatDate(entry.deadline);
  return (
    <li className="border rounded p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <strong>{entry.title}</strong>
          <p className="text-xs text-muted-foreground">
            {[entry.priority && `Priority: ${entry.priority}`, deadline && `Due ${deadline}`, entry.assignee].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {entry.id ? (
            <StatusControl
              status={entry.status}
              editable={capabilities.canUpdateTaskStatus}
              busy={busy}
              onChange={(status) => onStatusChange(entry.id!, status)}
            />
          ) : (
            <Badge variant="outline" className="capitalize">{statusLabel(entry.status)}</Badge>
          )}
          {entry.id && (
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpen((v) => !v)}>
              <MessageSquare className="w-3.5 h-3.5" />Comments
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>
      {open && entry.id && (
        <TaskDiscussion resourceType={resourceType} resourceId={resourceId} taskId={entry.id} canComment={capabilities.canComment} />
      )}
    </li>
  );
}

export default function SharedWithMe() {
  const { toast } = useToast();
  const { resourceType, resourceId } = useParams<{ resourceType: ClientViewResourceType; resourceId: string }>();
  const [resources, setResources] = useState<Array<{ id: string; resourceType: ClientViewResourceType; resourceId: string; accessLevel: ClientAccessLevel; grantedAt?: string | null; title: string }>>([]);
  const [data, setData] = useState<SharedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (resourceType && resourceId) {
        const result = await api.getAuthenticatedSharedResource(resourceType, resourceId);
        setData(result.data);
      } else {
        setData(null);
        const result = await api.getSharedWithMe();
        setResources(result.data.resources);
      }
      setError(null);
    } catch (e: any) {
      setData(null);
      setError(e?.message || "This shared resource is not available.");
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const changeStatus = async (taskId: string, status: string) => {
    if (!resourceType || !resourceId) return;
    setBusyTaskId(taskId);
    try {
      await api.updateSharedTaskStatus(resourceType, resourceId, taskId, status);
      await load(); // refetch so progress and stats stay server-computed
    } catch (e: any) {
      toast({ title: "Could not update status", description: e?.message || "Please try again", variant: "destructive" });
      await load();
    } finally {
      setBusyTaskId(null);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="py-16 flex justify-center"><Loader2 className="animate-spin" /></div></DashboardLayout>;
  }

  if (resourceType && resourceId) {
    if (!data) {
      return (
        <DashboardLayout>
          <Card><CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">{error || "This shared resource is not available."}</p>
            <Button asChild variant="outline"><Link to="/shared-with-me">Back to Shared with Me</Link></Button>
          </CardContent></Card>
        </DashboardLayout>
      );
    }

    const isProject = data.resourceType === "project";
    const item: any = isProject ? data.project : data.task;
    const entries: any[] = (isProject ? item.tasks : item.subtasks) || [];
    const { capabilities } = data;
    const dates = isProject
      ? [formatDate(item.startDate) && `Starts ${formatDate(item.startDate)}`, formatDate(item.endDate) && `Ends ${formatDate(item.endDate)}`]
      : [formatDate(item.deadline) && `Due ${formatDate(item.deadline)}`];

    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl">
          <div>
            <p className="text-sm text-muted-foreground">Shared with me · <span className="capitalize">{data.accessLevel}</span> access</p>
            <h1 className="text-2xl font-bold">{item.name || item.title}</h1>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {!isProject && item.id ? (
                  <StatusControl status={item.status} editable={capabilities.canUpdateTaskStatus} busy={busyTaskId === item.id} onChange={(s) => changeStatus(item.id, s)} />
                ) : (
                  <Badge variant="outline" className="capitalize">{statusLabel(item.status || "active")}</Badge>
                )}
                <span className="text-sm text-muted-foreground">Progress {item.progress ?? 0}%</span>
                {dates.filter(Boolean).map((text) => <span key={text as string} className="text-sm text-muted-foreground">{text}</span>)}
              </div>
              {item.description && <p className="whitespace-pre-wrap">{item.description}</p>}
              {!isProject && item.id && (
                <TaskDiscussion resourceType="task" resourceId={resourceId} taskId={item.id} canComment={capabilities.canComment} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{isProject ? "Shared project tasks" : "Shared subtasks"}</CardTitle></CardHeader>
            <CardContent>
              {entries.length ? (
                <ul className="space-y-2">
                  {entries.map((entry, index) => (
                    <TaskRow
                      key={entry.id || index}
                      entry={entry}
                      resourceType={resourceType}
                      resourceId={resourceId}
                      capabilities={capabilities}
                      busy={busyTaskId === entry.id}
                      onStatusChange={changeStatus}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No items to display.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Resource-scoped client access</p>
          <h1 className="text-2xl font-bold">Shared with Me</h1>
        </div>
        {resources.length ? (
          <div className="grid gap-3">
            {resources.map((resource) => (
              <Link key={resource.id} to={`/shared-with-me/${resource.resourceType}/${resource.resourceId}`}>
                <Card className="hover:border-primary">
                  <CardContent className="pt-5 flex gap-3 items-center">
                    {resource.resourceType === "project" ? <FolderKanban /> : <ListChecks />}
                    <div>
                      <p className="font-medium">{resource.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{resource.resourceType} · {resource.accessLevel}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nothing has been shared with you yet. When someone approves your access request, the project or task will appear here.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
