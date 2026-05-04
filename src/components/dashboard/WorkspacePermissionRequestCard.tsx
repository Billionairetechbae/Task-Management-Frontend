import { useEffect, useMemo, useState } from "react";
import { api, WorkspaceAccessPermissionKey, WorkspaceAccessRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContentCard,
  SectionHeader,
} from "@/components/dashboard/DashboardComponents";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type PermissionOption = {
  permissionKey: WorkspaceAccessPermissionKey;
  title: string;
  description: string;
  allowed: boolean;
};

type Props = {
  className?: string;
  onRequestCreated?: () => void;
};

const WorkspacePermissionRequestCard = ({
  className,
  onRequestCreated,
}: Props) => {
  const { workspaceRole } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<WorkspaceAccessRequest[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<PermissionOption | null>(null);
  const [reason, setReason] = useState("");

  const permissionOptions: PermissionOption[] = useMemo(
    () => [
      {
        permissionKey: "create_project_tasks",
        title: "Create project tasks",
        description: "Request permission to create tasks inside workspace projects.",
        allowed: canPerformRoleOperation("create_project_tasks", workspaceRole),
      },
      {
        permissionKey: "create_tasks",
        title: "Create workspace tasks",
        description: "Request permission to create general workspace tasks.",
        allowed: canPerformRoleOperation("create_tasks", workspaceRole),
      },
      {
        permissionKey: "create_projects",
        title: "Create projects",
        description: "Request permission to create new projects in this workspace.",
        allowed: canPerformRoleOperation("create_projects", workspaceRole),
      },
      {
        permissionKey: "view_all_projects",
        title: "View all projects",
        description: "Request permission to see all projects in this workspace.",
        allowed: canPerformRoleOperation("view_all_projects", workspaceRole),
      },
      {
        permissionKey: "view_all_tasks",
        title: "View all tasks",
        description: "Request permission to see all tasks in this workspace.",
        allowed: canPerformRoleOperation("view_all_tasks", workspaceRole),
      },
    ],
    [workspaceRole, canPerformRoleOperation]
  );

  const missingPermissions = permissionOptions.filter((item) => !item.allowed);

  const pendingPermissionKeys = useMemo(() => {
    return new Set(
      pendingRequests
        .filter((request) => request.status === "pending")
        .map((request) => request.permissionKey)
    );
  }, [pendingRequests]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);

      const res = await api.listAccessRequests({ status: "pending" });
      const requests = res?.data?.requests || [];

      setPendingRequests(Array.isArray(requests) ? requests : []);
    } catch {
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!selectedPermission) return;

    try {
      setSubmitting(true);

      await api.createAccessRequest({
        permissionKey: selectedPermission.permissionKey,
        reason: reason.trim() || undefined,
      });

      toast({
        title: "Access request sent",
        description: "A workspace admin will review your request.",
      });

      setReason("");
      setSelectedPermission(null);

      await loadPendingRequests();
      onRequestCreated?.();
    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (workspaceRole === "member") {
      loadPendingRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRole]);

  if (workspaceRole !== "member") return null;

  if (!loading && missingPermissions.length === 0) return null;

  return (
    <>
      <ContentCard className={cn("mb-6", className)}>
        <SectionHeader
          title="Workspace Permissions"
          description="Request additional workspace permissions when your current role limits what you can do."
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {loading ? (
            <div className="col-span-full flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading available permissions...
            </div>
          ) : (
            missingPermissions.map((item) => {
              const isPending = pendingPermissionKeys.has(item.permissionKey);

              return (
                <div
                  key={item.permissionKey}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <KeyRound className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{item.title}</p>
                        {isPending && (
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            Pending
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant={isPending ? "outline" : "default"}
                      disabled={isPending}
                      onClick={() => setSelectedPermission(item)}
                    >
                      {isPending ? (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Request pending
                        </>
                      ) : (
                        <>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Request access
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ContentCard>

      <Dialog
        open={!!selectedPermission}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPermission(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request workspace permission</DialogTitle>
            <DialogDescription>
              This request will go to workspace owners, admins, and managers for review.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">{selectedPermission?.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {selectedPermission?.description}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Reason optional
            </label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Briefly explain why you need this permission."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPermission(null);
                setReason("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button onClick={submitRequest} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkspacePermissionRequestCard;