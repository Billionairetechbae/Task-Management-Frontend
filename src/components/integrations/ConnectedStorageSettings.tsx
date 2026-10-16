import { useCallback, useEffect, useState } from "react";
import { Cloud, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, type ConnectedStorageConnectionSummary } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Only internal workspace roles ever see this section. Clients / guests / external users get nothing (the backend rejects them too).
const INTERNAL_ROLES = ["owner", "admin", "manager", "member"];
const MANAGE_ROLES = ["owner", "admin"];

const CALLBACK_MESSAGES: Record<string, string> = {
  access_denied: "Dropbox access was not granted.",
  invalid_state: "That connection attempt expired or was already used. Please start again.",
  connection_exists: "This workspace already has a Dropbox connection.",
  account_mismatch: "That is a different Dropbox account from the one originally connected. Disconnect first to connect a different account.",
  insufficient_scope: "Dropbox did not grant all the permissions Admiino needs. Please try again and allow every permission.",
  forbidden: "Only workspace owners and admins can connect Dropbox.",
};

type StatusView = { label: string; tone: "default" | "secondary" | "destructive" | "outline" };
const statusView = (connection?: ConnectedStorageConnectionSummary): StatusView => {
  if (!connection || connection.status === "disconnected") return { label: "Disconnected", tone: "outline" };
  if (connection.status === "active") return { label: "Connected", tone: "default" };
  if (connection.status === "reauth_required") return { label: "Reconnect required", tone: "destructive" };
  return { label: "Connection problem", tone: "destructive" };
};

export function ConnectedStorageSettings() {
  const { workspaceRole } = useAuth();
  const [connection, setConnection] = useState<ConnectedStorageConnectionSummary | undefined>();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<"connect" | "reconnect" | "disconnect" | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const isInternal = INTERNAL_ROLES.includes(String(workspaceRole));
  const roleCanManage = MANAGE_ROLES.includes(String(workspaceRole));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await api.listConnectedStorageConnections();
      setCanManage(Boolean(res.data.canManage));
      setConnection(res.data.connections.find((item) => item.provider === "dropbox"));
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInternal) void load();
    else setLoading(false);
  }, [isInternal, load]);

  // Result of the Dropbox redirect (fixed return destination configured on the backend).
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("connected_storage");
    if (!result) return;
    const code = url.searchParams.get("code") || "";
    if (result === "success") toast.success("Dropbox connected to this workspace");
    else toast.error("Dropbox was not connected", { description: CALLBACK_MESSAGES[code] || "Something went wrong. Please try again." });
    url.searchParams.delete("connected_storage");
    url.searchParams.delete("code");
    window.history.replaceState({}, "", url.toString());
  }, []);

  if (!isInternal) return null;

  const manage = canManage && roleCanManage;
  const view = statusView(connection);
  const isCurrent = connection && connection.status !== "disconnected";

  const redirectToDropbox = async (mode: "connect" | "reconnect") => {
    setBusy(mode);
    try {
      const res = mode === "reconnect" && connection
        ? await api.reconnectConnectedStorage(connection.id)
        : await api.startDropboxConnection();
      window.location.assign(res.data.authorizationUrl);
    } catch (err: any) {
      toast.error("Could not start Dropbox connection", { description: err?.message || "Please try again later." });
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!connection) return;
    setBusy("disconnect");
    try {
      const res = await api.disconnectConnectedStorage(connection.id);
      toast.success(res.message || "Dropbox disconnected");
      setConfirmDisconnect(false);
      await load();
    } catch (err: any) {
      toast.error("Could not disconnect Dropbox", { description: err?.message || "Please try again later." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="connected-storage-heading" data-testid="connected-storage-section">
      <div>
        <h2 id="connected-storage-heading" className="text-xl font-semibold tracking-tight">Workspace Connected Storage</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Shared by this whole workspace and managed by workspace owners and admins. This is separate from the personal integrations above, which belong to your own account.
        </p>
      </div>

      <div className="rounded-xl border p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-lg bg-muted p-2"><Cloud className="w-5 h-5" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">Dropbox</span>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" /> : <Badge variant={view.tone}>{view.label}</Badge>}
            </div>
            {loadFailed && <p className="text-sm text-destructive mt-1">Could not load the Dropbox connection.</p>}
            {isCurrent && manage && (connection?.account?.name || connection?.account?.email) && (
              <p className="text-sm text-muted-foreground mt-1 truncate" data-testid="dropbox-account">
                {[connection.account?.name, connection.account?.email].filter(Boolean).join(" · ")}
              </p>
            )}
            {connection?.status === "reauth_required" && (
              <p className="text-sm mt-1 flex items-center gap-1"><ShieldAlert className="w-4 h-4 text-destructive" />Dropbox access has expired or was revoked and needs to be reconnected.</p>
            )}
            {!manage && !loading && (
              <p className="text-sm text-muted-foreground mt-1">
                {connection?.status === "active" ? "Dropbox is available for attaching files." : "Only workspace owners and admins can connect or manage Dropbox."}
              </p>
            )}
          </div>
        </div>

        {manage && !loading && (
          <div className="flex gap-2 flex-wrap">
            {!isCurrent && (
              <Button onClick={() => redirectToDropbox("connect")} disabled={busy !== null}>
                {busy === "connect" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Connect Dropbox
              </Button>
            )}
            {connection && connection.status !== "active" && connection.status !== "disconnected" && (
              <Button onClick={() => redirectToDropbox("reconnect")} disabled={busy !== null}>
                {busy === "reconnect" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Reconnect
              </Button>
            )}
            {isCurrent && (
              <Button variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={busy !== null}>Disconnect</Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Dropbox?</AlertDialogTitle>
            <AlertDialogDescription>
              Admiino will stop accessing this workspace's Dropbox. Nothing is deleted from Dropbox, and existing links to Dropbox files are kept (they will not open until Dropbox is connected again).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "disconnect"}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void disconnect(); }} disabled={busy === "disconnect"}>
              {busy === "disconnect" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export default ConnectedStorageSettings;
