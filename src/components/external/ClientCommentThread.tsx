import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ExternalClientComment } from "@/lib/api";

interface Props {
  comments: ExternalClientComment[];
  /** Null hides the composer (read-only Viewer, or nobody to talk to). */
  onSubmit: ((content: string) => Promise<void>) | null;
  readOnlyNotice?: string;
  placeholder?: string;
  emptyText?: string;
}

/** Shared by the external portal and the internal Client Comments tab. Content is always rendered as plain text (never HTML). */
const ClientCommentThread = ({ comments, onSubmit, readOnlyNotice, placeholder = "Write a comment…", emptyText = "No comments yet." }: Props) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!onSubmit || sending || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit(draft.trim());
      setDraft("");
    } catch (e) {
      setError((e as Error)?.message || "Could not send your comment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Client comments">
          {comments.map((c) => (
            <li key={c.id} className={`rounded-lg border p-3 ${c.authorKind === "internal" ? "bg-primary/5" : "bg-card"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground break-all">{c.authorName}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {c.authorKind === "internal" ? c.authorOrganization || "Team" : "Client"}
                </Badge>
                <time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleString()}</time>
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-wrap break-words">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {onSubmit ? (
        <div className="flex flex-col gap-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} rows={3} maxLength={5000} aria-label="Comment" />
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={sending || !draft.trim()} className="gap-1.5">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </Button>
          </div>
        </div>
      ) : (
        readOnlyNotice && <p className="text-xs text-muted-foreground border-t pt-3">{readOnlyNotice}</p>
      )}
    </div>
  );
};

export default ClientCommentThread;
