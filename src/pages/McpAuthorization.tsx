import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, api, McpAuthorizationRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function McpAuthorization() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const requestId = searchParams.get("request_id") || "";
  const [request, setRequest] = useState<McpAuthorizationRequest | null>(null);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!requestId) {
      setError("This authorization request is missing or invalid.");
      setLoading(false);
      return () => { active = false; };
    }
    api.getMcpAuthorizationRequest(requestId)
      .then((result) => { if (active) setRequest(result); })
      .catch((reason) => {
        if (active) setError(reason instanceof ApiError ? reason.message : "Could not load this authorization request.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId]);

  const toggleWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceIds((current) => current.includes(workspaceId)
      ? current.filter((id) => id !== workspaceId)
      : [...current, workspaceId]);
  };

  const finishAuthorization = async (approved: boolean) => {
    if (!requestId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.completeMcpAuthorization(requestId, {
        approved,
        ...(approved ? { workspaceIds: selectedWorkspaceIds } : {}),
      });
      window.location.assign(result.redirectUrl);
    } catch (reason) {
      const message = reason instanceof ApiError ? reason.message : "Could not complete authorization.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl rounded-2xl">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Authorize an AI assistant</CardTitle>
          <CardDescription>
            Review the connection before allowing it to access Admiino on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking authorization request…
            </div>
          ) : error && !request ? (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
          ) : request ? (
            <>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Application requesting access</p>
                <p className="mt-1 font-medium">{request.client.name}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  OAuth callback host: {request.client.redirectHost}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Signed in as</p>
                <p className="mt-1 text-sm">{user?.email}</p>
              </div>

              <section className="space-y-2">
                <h2 className="text-sm font-medium">Permissions requested</h2>
                <p className="rounded-lg bg-muted/50 p-3 text-sm">
                  Read-only access to workspace information, tasks, projects, and team summaries. The assistant cannot create or change data.
                </p>
              </section>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Choose the workspaces this connection may access</legend>
                {request.workspaces.length ? request.workspaces.map((workspace) => (
                  <label key={workspace.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary"
                      checked={selectedWorkspaceIds.includes(workspace.id)}
                      onChange={() => toggleWorkspace(workspace.id)}
                      disabled={submitting}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{workspace.name}</span>
                      <span className="block text-xs capitalize text-muted-foreground">Your role: {workspace.role}</span>
                    </span>
                  </label>
                )) : (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    No active workspaces are available for this account.
                  </p>
                )}
              </fieldset>

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => void finishAuthorization(false)}>
                  <X className="mr-2 h-4 w-4" /> Deny
                </Button>
                <Button
                  type="button"
                  disabled={submitting || selectedWorkspaceIds.length === 0}
                  onClick={() => void finishAuthorization(true)}
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Allow selected workspaces
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You can disconnect this client at any time from Settings → Integrations.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
