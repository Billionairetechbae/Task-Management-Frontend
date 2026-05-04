import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, WorkspaceAccessRequest, WorkspaceRolePermissionKey } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  ShieldAlert,
  LockKeyhole,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  RefreshCw,
  History,
  UserCheck,
} from "lucide-react";

const PERMISSION_OPTIONS: Array<{
  key: WorkspaceRolePermissionKey;
  title: string;
  description: string;
}> = [
  {
    key: "create_project_tasks",
    title: "Create project tasks",
    description: "Request permission to create tasks inside workspace projects.",
  },
  {
    key: "create_tasks",
    title: "Create workspace tasks",
    description: "Request permission to create general workspace tasks.",
  },
  {
    key: "create_projects",
    title: "Create projects",
    description: "Request permission to create new projects in this workspace.",
  },
  {
    key: "view_all_projects",
    title: "View all projects",
    description: "Request permission to see all projects in this workspace.",
  },
  {
    key: "view_all_tasks",
    title: "View all tasks",
    description: "Request permission to see all tasks in this workspace.",
  },
  {
    key: "upload_workspace_files",
    title: "Upload workspace files",
    description: "Request permission to upload files into the workspace.",
  },
];

const permissionLabel = (key: string) =>
  key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const statusBadgeClass = (status: string) => {
  if (status === "approved") return "bg-success/10 text-success border-success/20";
  if (status === "denied") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-warning/10 text-warning border-warning/20";
};

const getRequesterName = (request: WorkspaceAccessRequest) => {
  const requester = request.requester;

  if (!requester) return "Unknown user";

  const name = `${requester.firstName || ""} ${requester.lastName || ""}`.trim();

  return name || requester.email || "Unknown user";
};

export default function WorkspaceAccessRequests() {
  const { user, workspaceRole } = useAuth();
  const { toast } = useToast();
  const {
    settings,
    canPerformRoleOperation,
    refetch: refetchWorkspaceSettings,
  } = useWorkspaceSettings();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WorkspaceAccessRequest[]>([]);
  const [submittingKey, setSubmittingKey] = useState<WorkspaceRolePermissionKey | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [reasonByPermission, setReasonByPermission] = useState<Record<string, string>>({});

  const isApprover =
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager" ||
    user?.role === "admin";

  const isTeamMember = workspaceRole === "member";

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const myRequests = useMemo(
    () => requests.filter((request) => request.requesterUserId === user?.id),
    [requests, user?.id]
  );

  const historyRequests = useMemo(
    () =>
      requests.filter((request) =>
        isApprover ? request.status !== "pending" : true
      ),
    [requests, isApprover]
  );

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.listAccessRequests();
      const list = response?.data?.requests || [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (error: any) {
      toast({
        title: "Failed to load access requests",
        description: error?.message || "Could not fetch requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRequestPermission = async (permissionKey: WorkspaceRolePermissionKey) => {
    try {
      setSubmittingKey(permissionKey);

      await api.createAccessRequest({
        permissionKey,
        reason: reasonByPermission[permissionKey]?.trim() || undefined,
      });

      toast({
        title: "Request sent",
        description: "Your workspace access request has been submitted.",
      });

      setReasonByPermission((prev) => ({
        ...prev,
        [permissionKey]: "",
      }));

      await loadRequests();
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error?.message || "Could not submit access request.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKey(null);
    }
  };

  const handleDecision = async (
    requestId: string,
    action: "approve" | "deny"
  ) => {
    try {
      setDecidingId(requestId);

      await api.decideAccessRequest(requestId, { action });

      toast({
        title: action === "approve" ? "Request approved" : "Request denied",
        description:
          action === "approve"
            ? "The user now has this individual permission."
            : "The request has been denied.",
      });

      await Promise.all([loadRequests(), refetchWorkspaceSettings()]);
    } catch (error: any) {
      toast({
        title: "Decision failed",
        description: error?.message || "Could not update the request.",
        variant: "destructive",
      });
    } finally {
      setDecidingId(null);
    }
  };

  const alreadyPendingKeys = useMemo(() => {
    return new Set(
      myRequests
        .filter((request) => request.status === "pending")
        .map((request) => request.permissionKey)
    );
  }, [myRequests]);

  const renderRequestCard = (request: WorkspaceAccessRequest, showActions: boolean) => (
    <div
      key={request.id}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="font-semibold text-sm">
            {permissionLabel(request.permissionKey)}
          </p>
          <Badge variant="outline" className={statusBadgeClass(request.status)}>
            {request.status}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Requested by {getRequesterName(request)}
        </p>

        {request.reason && (
          <p className="mt-2 text-sm text-muted-foreground">
            “{request.reason}”
          </p>
        )}

        <p className="mt-2 text-[11px] text-muted-foreground">
          {request.createdAt
            ? new Date(request.createdAt).toLocaleString()
            : "No date"}
        </p>
      </div>

      {showActions && request.status === "pending" && (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            onClick={() => handleDecision(request.id, "approve")}
            disabled={decidingId === request.id}
            className="gap-1.5"
          >
            {decidingId === request.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDecision(request.id, "deny")}
            disabled={decidingId === request.id}
            className="gap-1.5"
          >
            <XCircle className="h-3.5 w-3.5" />
            Deny
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Workspace Access
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Request, review, and manage workspace permission approvals.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={loadRequests}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Current access summary
            </CardTitle>
            <CardDescription>
              Your current workspace role is{" "}
              <span className="font-semibold capitalize text-foreground">
                {workspaceRole || "member"}
              </span>
              . Individual approvals can extend your permissions without changing the default role settings.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSION_OPTIONS.map((permission) => {
                const allowed = canPerformRoleOperation(permission.key, workspaceRole);

                return (
                  <div
                    key={permission.key}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{permission.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {allowed ? "Allowed" : "Restricted"}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        allowed
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {allowed ? "Active" : "No access"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {isTeamMember && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LockKeyhole className="h-4 w-4 text-primary" />
                Request additional permissions
              </CardTitle>
              <CardDescription>
                Send a request when your current workspace role limits what you need to do.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {PERMISSION_OPTIONS.map((permission) => {
                const alreadyAllowed = canPerformRoleOperation(
                  permission.key,
                  workspaceRole
                );

                const alreadyPending = alreadyPendingKeys.has(permission.key);

                return (
                  <div
                    key={permission.key}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold text-sm">
                            {permission.title}
                          </h3>

                          {alreadyAllowed && (
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20"
                            >
                              Already allowed
                            </Badge>
                          )}

                          {!alreadyAllowed && alreadyPending && (
                            <Badge
                              variant="outline"
                              className="bg-warning/10 text-warning border-warning/20"
                            >
                              Pending
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleRequestPermission(permission.key)}
                        disabled={
                          submittingKey === permission.key ||
                          alreadyAllowed ||
                          alreadyPending
                        }
                        className="shrink-0 gap-2"
                      >
                        {submittingKey === permission.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {alreadyPending ? "Request pending" : "Request access"}
                      </Button>
                    </div>

                    {!alreadyAllowed && !alreadyPending && (
                      <div className="mt-3">
                        <Textarea
                          value={reasonByPermission[permission.key] || ""}
                          onChange={(event) =>
                            setReasonByPermission((prev) => ({
                              ...prev,
                              [permission.key]: event.target.value,
                            }))
                          }
                          placeholder="Optional: explain why you need this permission"
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {isApprover && pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4 text-primary" />
                Approval queue
              </CardTitle>
              <CardDescription>
                Review pending individual workspace permission requests.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {pendingRequests.map((request) => renderRequestCard(request, true))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              {isApprover ? "Request history" : "My request history"}
            </CardTitle>
            <CardDescription>
              {isApprover
                ? "View approved and denied permission requests."
                : "Track the status of your submitted access requests."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : historyRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center">
                <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No requests yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Access requests will appear here when submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyRequests.map((request) =>
                  renderRequestCard(request, false)
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {settings?.userPermissionOverrides &&
          Object.keys(settings.userPermissionOverrides).length > 0 && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Some of your permissions are based on individual approvals, not only your workspace role.
              </p>
            </>
          )}
      </div>
    </DashboardLayout>
  );
}