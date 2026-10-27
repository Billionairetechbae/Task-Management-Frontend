import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, ExternalShareResourceType, ExternalClientComment } from "@/lib/api";
import ClientCommentThread from "./ClientCommentThread";

interface Props {
  resourceType: ExternalShareResourceType;
  resourceId: string;
}

/** Internal "Client Comments" section. Separate from internal comments: nothing typed here is internal chat, and internal chat never appears here. */
const ClientCommentsPanel = ({ resourceType, resourceId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<ExternalClientComment[]>([]);
  const [hasCollaborators, setHasCollaborators] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.listExternalClientComments(resourceType, resourceId);
      setComments(res.data.comments);
      setHasCollaborators(res.data.hasExternalCollaborators);
      setError(null);
    } catch (e) {
      setError((e as Error)?.message || "Client comments are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (error) return <p className="p-4 text-sm text-muted-foreground">{error}</p>;

  return (
    <div className="h-full overflow-y-auto p-4">
      <p className="mb-3 text-xs text-muted-foreground rounded-md bg-muted/50 p-2">
        Visible to the external clients this {resourceType} is shared with. Replies here are seen by them — keep internal discussion in the other tabs.
      </p>
      <ClientCommentThread
        comments={comments}
        emptyText={hasCollaborators ? "No client comments yet." : "Nobody outside your team has access yet. Use Share → Invite external client."}
        placeholder="Reply to the client…"
        onSubmit={hasCollaborators ? async (content) => {
          const res = await api.replyToExternalClients({ resourceType, resourceId, content });
          setComments((prev) => [...prev, res.data.comment]);
        } : null}
      />
    </div>
  );
};

export default ClientCommentsPanel;
