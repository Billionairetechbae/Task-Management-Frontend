import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { ApiError, api, MCP_SERVER_URL, McpConnection } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function McpConnections() {
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      setConnections(await api.getMcpConnections());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load MCP connections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL);
      toast.success("MCP server URL copied");
    } catch {
      toast.error("Could not copy the MCP server URL.");
    }
  };

  const disconnect = async (connection: McpConnection) => {
    if (!window.confirm(`Disconnect ${connection.clientName}? This immediately revokes its Admiino access.`)) return;
    setDisconnecting(connection.id);
    try {
      await api.revokeMcpConnection(connection.id);
      setConnections((current) => current.filter((item) => item.id !== connection.id));
      toast.success(`${connection.clientName} disconnected`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not disconnect this client.");
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">AI assistant connections (MCP)</CardTitle>
        <CardDescription>
          Connect ChatGPT, Claude, or another remote MCP client to the workspaces and task actions you authorize.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">MCP server URL</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-md bg-background px-3 py-2 text-xs">{MCP_SERVER_URL}</code>
            <Button type="button" variant="outline" onClick={copyEndpoint} className="shrink-0">
              <Copy className="mr-2 h-4 w-4" /> Copy URL
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            In your AI client, add a remote MCP connector using this URL, then sign in to Admiino and choose the workspaces it may read.
            Admiino never shares a workspace unless you select it in the consent screen.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Connected clients</h3>
            <p className="text-xs text-muted-foreground">Disconnecting revokes the connection and its tokens immediately.</p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading connections…
            </div>
          ) : connections.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No AI assistant connections yet.</p>
          ) : (
            <ul className="space-y-3">
              {connections.map((connection) => (
                <li key={connection.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{connection.clientName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {connection.scopes.includes("mcp:write") ? "Read and task changes" : "Read-only"}
                      {" · "}
                      {connection.workspaces.map((workspace) => workspace.name).join(", ") || "No currently active workspaces"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Connected {new Date(connection.createdAt).toLocaleDateString()}
                      {connection.lastUsedAt ? ` · Last used ${new Date(connection.lastUsedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disconnecting === connection.id}
                    onClick={() => void disconnect(connection)}
                  >
                    {disconnecting === connection.id
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Unplug className="mr-2 h-4 w-4" />}
                    Disconnect
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">ChatGPT:</span> add the URL as a custom remote connector in ChatGPT settings.</p>
          <p><span className="font-medium text-foreground">Claude:</span> add the URL as a custom remote connector in Claude settings.</p>
          <p>Tools are limited to the permissions and workspaces selected during Admiino consent.</p>
        </div>
      </CardContent>
    </Card>
  );
}
