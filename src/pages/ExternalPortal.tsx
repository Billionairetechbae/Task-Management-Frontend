import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Eye, MessageSquare, CalendarDays, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClientCommentThread from "@/components/external/ClientCommentThread";
import type { ExternalClientComment } from "@/lib/api";
import {
  ExternalSessionError, ExternalSharedView, clearStoredSession, getSharedComments, getSharedView,
  getStoredSession, postSharedComment, redeemInvitation, requestNewLink,
} from "@/lib/externalPortalApi";

const pretty = (s?: string | null) => (s ? s.replace(/_/g, " ") : "—");
const day = (s?: string | null) => { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(); };

// The invitation token is single-use. React StrictMode runs effects twice in development, so redemption is memoised per token.
const redemptions = new Map<string, ReturnType<typeof redeemInvitation>>();
const redeemOnce = (token: string) => {
  if (!redemptions.has(token)) redemptions.set(token, redeemInvitation(token));
  return redemptions.get(token)!;
};

// Defined at module level: a component declared inside ExternalPortal would remount (and drop input focus) on every render.
const Shell = ({ organization, children }: { organization?: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-muted/30">
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <span className="text-lg font-semibold tracking-tight">Admiino</span>
        {organization && <span className="text-sm text-muted-foreground truncate">Shared by {organization}</span>}
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-6 grid gap-4">{children}</main>
    <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-muted-foreground">You can only see what {organization || "the sender"} chose to share with you.</footer>
  </div>
);

type Phase = "loading" | "ready" | "expired" | "unavailable";

/** The whole external experience: no sidebar, no navigation into Admiino, no signup. Reached from the emailed link. */
const ExternalPortal = () => {
  const { shareReference = "" } = useParams<{ shareReference: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [view, setView] = useState<ExternalSharedView | null>(null);
  const [comments, setComments] = useState<ExternalClientComment[]>([]);
  const [email, setEmail] = useState("");
  const [linkRequested, setLinkRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([getSharedView(shareReference), getSharedComments(shareReference)]);
      setView(v); setComments(c); setPhase("ready");
    } catch (e) {
      if (e instanceof ExternalSessionError) { clearStoredSession(shareReference); setPhase("expired"); }
      else setPhase("unavailable");
    }
  }, [shareReference]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const match = /(?:^#|&)token=([^&]+)/.exec(window.location.hash);
      if (match) {
        // Remove the secret from the address bar before anything else can read it (history, referrer, screenshots).
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        try { await redeemOnce(decodeURIComponent(match[1])); }
        catch (e) {
          // A reused link is harmless when this browser already holds a valid session for the share.
          if (!getStoredSession(shareReference)) { if (!cancelled) setPhase(e instanceof ExternalSessionError ? "expired" : "unavailable"); return; }
        }
      }
      if (cancelled) return;
      if (!getStoredSession(shareReference)) { setPhase("expired"); return; }
      await load();
    })();
    return () => { cancelled = true; };
  }, [shareReference, load]);

  const submitLinkRequest = async () => {
    if (!email.trim() || requesting) return;
    setRequesting(true);
    try { await requestNewLink(shareReference, email.trim()); } catch { /* the answer is the same either way */ }
    setLinkRequested(true); setRequesting(false);
  };

  if (phase === "loading") return <Shell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div></Shell>;

  if (phase === "unavailable") return (
    <Shell><Card><CardContent className="py-10 text-center grid gap-2"><ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" /><p className="font-medium">This shared item is unavailable</p><p className="text-sm text-muted-foreground">It may have been removed. Contact the person who invited you.</p></CardContent></Card></Shell>
  );

  if (phase === "expired" || !view) return (
    <Shell>
      <Card>
        <CardHeader><CardTitle className="text-base">Your access has expired or been revoked</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">If you were invited with the email address below, we can send you a fresh link. No account is needed.</p>
          {linkRequested ? (
            <p role="status" className="text-sm">If that email has access, a new link is on its way.</p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Your email address" />
              <Button onClick={submitLinkRequest} disabled={requesting || !email.trim()}>Email me a new link</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );

  const title = view.project?.name ?? view.task?.title ?? "";
  const kind = view.resourceType === "project" ? "Project" : "Task";
  return (
    <Shell organization={view.organization}>
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{kind}</Badge>
            <Badge variant="secondary" className="gap-1">
              {view.canComment ? <MessageSquare className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {view.canComment ? "Commenter" : "Viewer"}
            </Badge>
          </div>
          <CardTitle className="text-xl break-words">{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(view.task?.description || view.project?.description) && <p className="text-sm whitespace-pre-wrap break-words">{view.task?.description || view.project?.description}</p>}
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="capitalize">{pretty(view.task?.status ?? view.project?.status)}</dd></div>
            {day(view.task?.dueDate) && <div><dt className="text-xs text-muted-foreground">Due</dt><dd className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{day(view.task?.dueDate)}</dd></div>}
            {view.project?.progress != null && <div><dt className="text-xs text-muted-foreground">Progress</dt><dd>{view.project.progress}%</dd></div>}
            {day(view.project?.endDate) && <div><dt className="text-xs text-muted-foreground">Target date</dt><dd>{day(view.project?.endDate)}</dd></div>}
          </dl>
          {view.project && view.project.tasks.length > 0 && (
            <section aria-label="Shared tasks">
              <h2 className="mb-2 text-sm font-semibold">Shared tasks</h2>
              <ul className="grid gap-2">
                {view.project.tasks.map((t) => (
                  <li key={t.id} className="rounded-md border bg-card p-3">
                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium break-words">{t.title}</span><Badge variant="outline" className="capitalize shrink-0">{pretty(t.status)}</Badge></div>
                    {t.description && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words">{t.description}</p>}
                    {day(t.dueDate) && <p className="mt-1 text-xs text-muted-foreground">Due {day(t.dueDate)}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Client Comments</CardTitle></CardHeader>
        <CardContent>
          <ClientCommentThread
            comments={comments}
            readOnlyNotice="You have view-only access, so you can read this conversation but not add to it."
            onSubmit={view.canComment ? async (content) => {
              try {
                const created = await postSharedComment(shareReference, content);
                setComments((prev) => [...prev, created]);
              } catch (e) {
                if (e instanceof ExternalSessionError) { clearStoredSession(shareReference); setPhase("expired"); }
                throw e;
              }
            } : null}
          />
        </CardContent>
      </Card>
    </Shell>
  );
};

export default ExternalPortal;
