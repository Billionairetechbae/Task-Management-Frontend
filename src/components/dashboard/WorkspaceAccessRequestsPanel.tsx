import { useEffect, useState } from "react";
import { api, WorkspaceAccessRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ContentCard,
  SectionHeader,
  LoadingState,
} from "@/components/dashboard/DashboardComponents";
import {
  CheckCircle2,
  XCircle,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onDecision?: () => void;
  hideWhenEmpty?: boolean;
};

const permissionLabels: Record<string, string> = {
  create_tasks: "Create tasks",
  view_all_tasks: "View all tasks",
  create_projects: "Create projects",
  view_all_projects: "View all projects",
  create_project_tasks: "Create project tasks",
  upload_workspace_files: "Upload workspace files",
};

const getName = (request: WorkspaceAccessRequest) => {
  const requester = request.requester;
  if (!requester) return "Unknown user";

  const fullName = [requester.firstName, requester.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || requester.email || "Unknown user";
};

const formatDate = (date?: string | null) => {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
};

const formatPermissionKey = (key: string) => {
  return permissionLabels[key] || key.split("_").join(" ");
};

const WorkspaceAccessRequestsPanel = ({
  className,
  onDecision,
  hideWhenEmpty = false,
}: Props) => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<WorkspaceAccessRequest[]>([]);

  const loadRequests = async () => {
    try {
      setLoading(true);

      const res = await api.listAccessRequests({
        status: "pending",
      });

      const list = res?.data?.requests || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast({
        title: "Failed to load access requests",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const decide = async (requestId: string, action: "approve" | "deny") => {
    try {
      setDecidingId(requestId);

      await api.decideAccessRequest(requestId, { action });

      toast({
        title: action === "approve" ? "Access approved" : "Access denied",
        description:
          action === "approve"
            ? "The requested permission has been enabled."
            : "The request has been denied.",
      });

      await loadRequests();
      onDecision?.();
    } catch (err: any) {
      toast({
        title: "Decision failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDecidingId(null);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading && hideWhenEmpty && requests.length === 0) {
    return null;
  }

  return (
    <ContentCard className={cn("mb-6", className)}>
      <SectionHeader
        title="Workspace Access Requests"
        description="Review permission requests from team members."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Loading access requests..." />
      ) : (
        <div className="mt-4 space-y-3">
          {requests.map((request) => {
            const isBusy = decidingId === request.id;
            const label = formatPermissionKey(request.permissionKey);

            return (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <KeyRound className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{getName(request)}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.requester?.email || "No email"} • {formatDate(request.createdAt)}
                      </p>
                    </div>

                    <Badge variant="outline" className="bg-warning/10 text-warning">
                      Pending
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-[220px_1fr]">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Permission
                      </p>
                      <p className="mt-1 text-sm font-medium">{label}</p>
                    </div>

                    {request.reason && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Reason
                        </p>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {request.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide(request.id, "approve")}
                    disabled={isBusy}
                    className="gap-2"
                  >
                    {isBusy ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide(request.id, "deny")}
                    disabled={isBusy}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Deny
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ContentCard>
  );
};

export default WorkspaceAccessRequestsPanel;