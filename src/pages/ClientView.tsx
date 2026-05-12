import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ClientViewPayload } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  KeyRound,
  Eye,
  AlertCircle,
  Calendar,
  ListChecks,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";

const formatStatus = (s?: string | null) =>
  s ? s.replace(/_/g, " ") : "—";
const formatDate = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
};

const ClientView = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClientViewPayload | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid link");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getPublicClientView(token);
        if (!cancelled) setData(res.data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "This link is unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleRequestAccess = async () => {
    if (!token) return;
    if (!user) {
      const redirect = `/client-view/${token}`;
      navigate(`/?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.createResourceAccessRequest({ token, reason: reason.trim() || undefined });
      toast({
        title: "Access requested",
        description: "The workspace owner will review your request.",
      });
      setReason("");
    } catch (e: any) {
      toast({
        title: "Could not submit request",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">Link unavailable</h2>
            <p className="text-sm text-muted-foreground">
              {error || "This share link is invalid, expired, or has been revoked."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RequestAccessBlock = (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Request deeper access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Need to comment, edit, or collaborate? Send a request to the workspace owner.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional: explain why you need access"
          rows={3}
        />
        <Button
          onClick={handleRequestAccess}
          disabled={submitting || !data.canRequestAccess}
          className="gap-2"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          {user ? "Request Access" : "Sign in to request access"}
        </Button>
        {!data.canRequestAccess && (
          <p className="text-xs text-muted-foreground">
            Access requests are disabled for this resource.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              {data.resourceType === "project" ? (
                <FolderKanban className="w-5 h-5 text-primary" />
              ) : (
                <ListChecks className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Shared {data.resourceType}
              </p>
              <p className="text-sm font-semibold">Admiino · Client View</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Eye className="w-3 h-3" /> Read-only client view
            </Badge>
            {data.canRequestAccess && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRequestAccess}
                disabled={submitting}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Request Access
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {data.resourceType === "project"
          ? renderProject(data.project)
          : renderTask(data.task)}

        {RequestAccessBlock}
      </main>
    </div>
  );
};

function renderProject(project: ClientViewPayload extends { resourceType: "project" } ? any : any) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            {project.logoUrl && (
              <img
                src={project.logoUrl}
                alt={project.name}
                className="w-14 h-14 rounded-lg object-cover border"
              />
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {project.status && (
                  <Badge variant="outline" className="capitalize">
                    {formatStatus(project.status)}
                  </Badge>
                )}
                {(project.startDate || project.endDate) && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.startDate)} – {formatDate(project.endDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.description}
            </p>
          )}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress ?? 0}%</span>
            </div>
            <Progress value={project.progress ?? 0} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ["Total", project.stats?.totalTasks],
              ["Completed", project.stats?.completed],
              ["In Progress", project.stats?.inProgress],
              ["Pending", project.stats?.pending],
              ["Overdue", project.stats?.overdue],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border p-3 text-center bg-card">
                <p className="text-xl font-bold">{value ?? 0}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!project.tasks || project.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tasks to display.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Priority</th>
                    <th className="py-2">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {project.tasks.map((t: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{t.title}</td>
                      <td className="py-2 pr-4 capitalize">{formatStatus(t.status)}</td>
                      <td className="py-2 pr-4 capitalize">{formatStatus(t.priority)}</td>
                      <td className="py-2">{formatDate(t.deadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function renderTask(task: any) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{task.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {task.status && (
              <Badge variant="outline" className="capitalize">
                {formatStatus(task.status)}
              </Badge>
            )}
            {task.priority && (
              <Badge variant="secondary" className="capitalize">
                {formatStatus(task.priority)}
              </Badge>
            )}
            {task.category && (
              <Badge variant="outline">{task.category}</Badge>
            )}
            {task.deadline && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due {formatDate(task.deadline)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          )}
          {task.assignee && (
            <p className="text-sm">
              <span className="text-muted-foreground">Assignee:</span>{" "}
              <span className="font-medium">{task.assignee}</span>
            </p>
          )}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{task.progress ?? 0}%</span>
            </div>
            <Progress value={task.progress ?? 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Subtasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!task.subtasks || task.subtasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No subtasks to display.
            </p>
          ) : (
            <ul className="space-y-2">
              {task.subtasks.map((s: any, i: number) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 border rounded-lg p-3"
                >
                  <span className="text-sm font-medium truncate">{s.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.priority && (
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {formatStatus(s.priority)}
                      </Badge>
                    )}
                    {s.status && (
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {formatStatus(s.status)}
                      </Badge>
                    )}
                    {s.deadline && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(s.deadline)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default ClientView;
