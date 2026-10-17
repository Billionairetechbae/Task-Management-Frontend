import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, LifeBuoy, Loader2, MessageSquareText, Paperclip, Send, Sparkles, TicketCheck } from "lucide-react";
import { api, SupportMessage, SupportTicket } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type ChatLine = { role: "user" | "assistant"; content: string; guide?: { title: string; href: string }; recommendHuman?: boolean };
type View = "home" | "chat" | "escalate" | "requests" | "ticket";
const STATUS_LABEL: Record<string, string> = { received: "Received", in_review: "In review", waiting_on_user: "Waiting on you", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };
const STATUS_STYLE: Record<string, string> = { received: "bg-blue-500/10 text-blue-700", in_review: "bg-violet-500/10 text-violet-700", waiting_on_user: "bg-amber-500/10 text-amber-700", in_progress: "bg-primary/10 text-primary", resolved: "bg-emerald-500/10 text-emerald-700", closed: "bg-muted text-muted-foreground" };

export default function SupportLauncher() {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general_help");
  const [handoffMessage, setHandoffMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");

  useEffect(() => {
    if (!user?.id) { setUnreadCount(0); return; }
    api.listSupportTickets().then((response) => setUnreadCount(response.data.tickets.filter((item) => item.unread).length)).catch(() => {});
  }, [user?.id]);

  const transcript = useMemo(() => messages.slice(-8).map(({ role, content }) => ({ role, content })), [messages]);
  const startChat = (prompt = "") => { setView("chat"); setQuestion(prompt); };
  const sendQuestion = async () => {
    const text = question.trim();
    if (!text || sending) return;
    setQuestion(""); setLastQuestion(text); setMessages((current) => [...current, { role: "user", content: text }]); setSending(true);
    try {
      const result = await api.askSupportAI(text);
      setMessages((current) => [...current, { role: "assistant", content: result.data.answer, guide: result.data.guide || undefined, recommendHuman: result.data.recommendHuman }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I can’t reach the help service right now. You can still contact our support team and include your question.", recommendHuman: true }]);
    } finally { setSending(false); }
  };
  const beginEscalation = (initialCategory = "general_help") => {
    setCategory(initialCategory); setSubject((lastQuestion || messages.find((item) => item.role === "user")?.content || "").slice(0, 180));
    setHandoffMessage(lastQuestion || messages.find((item) => item.role === "user")?.content || ""); setConfirmed(false); setView("escalate");
  };
  const createTicket = async () => {
    if (!confirmed || sending || !subject.trim() || !handoffMessage.trim()) return;
    setSending(true);
    const summary = messages.length ? [`Issue: ${subject.trim()}`, `Reason for handoff: ${messages.findLast((item) => item.role === "assistant" && item.recommendHuman)?.content || "The user requested human support."}`, "Recent conversation:", ...transcript.map((line) => `${line.role === "user" ? "User" : "Admiino AI"}: ${line.content}`)].join("\n").slice(0, 4000) : "";
    try {
      const result = await api.createSupportTicket({ subject: subject.trim(), category, message: handoffMessage.trim(), confirmed: true, context: { sourcePath: location.pathname }, aiEscalated: messages.length > 0, aiSummary: summary, transcript, attachments: files });
      const created = result.data.ticket;
      setTicket({ ...created, messages: [{ id: "first", authorType: "user", content: handoffMessage.trim(), createdAt: new Date().toISOString() }] });
      setView("ticket"); setFiles([]); setUnreadCount(0);
    } catch (error: any) { toast({ title: "Request not sent", description: error?.message || "Try again in a moment.", variant: "destructive" }); }
    finally { setSending(false); }
  };
  const loadTickets = async () => {
    setLoadingTickets(true); setView("requests");
    try { const result = await api.listSupportTickets(); setTickets(result.data.tickets); setUnreadCount(result.data.tickets.filter((item) => item.unread).length); }
    catch { toast({ title: "Could not load support requests", variant: "destructive" }); }
    finally { setLoadingTickets(false); }
  };
  const openTicket = async (item: SupportTicket) => {
    setSending(true);
    try { const result = await api.getSupportTicket(item.id); setTicket(result.data.ticket); setView("ticket"); setUnreadCount((count) => Math.max(0, count - (item.unread ? 1 : 0))); }
    catch { toast({ title: "Could not open this request", variant: "destructive" }); }
    finally { setSending(false); }
  };
  const sendReply = async () => {
    if (!ticket || !reply.trim() || sending) return;
    setSending(true);
    try { const result = await api.replySupportTicket(ticket.id, reply.trim(), files); setTicket((current) => current ? { ...current, status: result.data.ticket.status, messages: [...(current.messages || []), result.data.message] } : current); setReply(""); setFiles([]); }
    catch (error: any) { toast({ title: "Reply not sent", description: error?.message, variant: "destructive" }); }
    finally { setSending(false); }
  };
  const back = () => { if (view === "ticket") setView("requests"); else setView("home"); };

  return <>
    <TooltipProvider delayDuration={250}><Tooltip><TooltipTrigger asChild><Button type="button" aria-label="Open Admiino AI & Support" onClick={() => { setOpen(true); if (view === "home") setView("home"); }} className="fixed bottom-5 right-5 z-40 h-12 gap-2 rounded-full px-4 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"><MessageSquareText className="h-5 w-5" /><span className="hidden sm:inline">Support</span>{unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unreadCount}</span>}</Button></TooltipTrigger><TooltipContent side="left">Admiino AI &amp; Support</TooltipContent></Tooltip></TooltipProvider>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="flex h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-[min(30rem,100vw)]">
      <SheetHeader className="border-b px-5 py-4 pr-12 text-left"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div><div><SheetTitle>Admiino AI</SheetTitle><SheetDescription>How can I help?</SheetDescription></div></div><p className="mt-3 text-sm text-muted-foreground">Ask about Admiino, troubleshoot a problem, or contact our support team.</p></SheetHeader>
      {view !== "home" && <div className="flex items-center gap-2 border-b px-4 py-2"><Button variant="ghost" size="sm" onClick={back} aria-label="Back to support"><ArrowLeft className="mr-1 h-4 w-4" />Back</Button><span className="truncate text-xs text-muted-foreground">{view === "chat" ? "Ask Admiino AI" : view === "escalate" ? "Contact Support" : view === "requests" ? "My support requests" : ticket?.ticketNumber}</span></div>}
      <div className="flex-1 overflow-y-auto p-4">
        {view === "home" && <div className="space-y-3"><p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What would you like to do?</p>
          <button onClick={() => startChat()} className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"><Sparkles className="h-5 w-5 text-primary" /><span className="flex-1"><span className="block text-sm font-medium">Ask Admiino AI</span><span className="mt-0.5 block text-xs text-muted-foreground">Get help with features and common issues.</span></span></button>
          <button onClick={() => beginEscalation("bug")} className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"><LifeBuoy className="h-5 w-5 text-primary" /><span className="flex-1"><span className="block text-sm font-medium">Report a problem</span><span className="mt-0.5 block text-xs text-muted-foreground">Send a summary to the support team.</span></span></button>
          <button onClick={() => beginEscalation("feature_request")} className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"><MessageSquareText className="h-5 w-5 text-primary" /><span className="flex-1"><span className="block text-sm font-medium">Suggest an improvement</span><span className="mt-0.5 block text-xs text-muted-foreground">Share an idea for Admiino.</span></span></button>
          <button onClick={() => void loadTickets()} className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"><TicketCheck className="h-5 w-5 text-primary" /><span className="flex-1"><span className="block text-sm font-medium">My support requests</span><span className="mt-0.5 block text-xs text-muted-foreground">Follow replies and request status.</span></span></button>
          <a href="https://www.admiino.com/guide" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border p-4 text-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"><ArrowUpRight className="h-5 w-5 text-primary" />Browse Help Center</a>
        </div>}
        {view === "chat" && <div className="space-y-4"><div className="rounded-2xl rounded-tl-sm bg-muted/70 p-3 text-sm"><p className="font-medium">Hi {user?.firstName || "there"}. What can I help with?</p><p className="mt-1 text-muted-foreground">I’ll answer from Admiino help information. If I’m unsure, I’ll help you contact a person.</p></div>
          {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`max-w-[92%] rounded-2xl p-3 text-sm ${message.role === "user" ? "ml-auto rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted/70"}`}><p className="whitespace-pre-wrap">{message.content}</p>{message.guide && <a href={message.guide.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline">Learn more: {message.guide.title}<ArrowUpRight className="h-3 w-3" /></a>}{message.recommendHuman && <div className="mt-3 rounded-lg border border-primary/20 bg-background p-3"><p className="text-xs">I think our support team should take a closer look. I can send them a summary so you don’t have to explain everything again.</p><Button size="sm" className="mt-2" onClick={() => beginEscalation("general_help")}>Send to Customer Support</Button></div>}</div>)}
          {sending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Admiino AI is checking the help information…</div>}
        </div>}
        {view === "escalate" && <div className="space-y-4"><div className="rounded-xl border bg-muted/20 p-3"><p className="text-sm font-medium">Review your request</p><p className="mt-1 text-xs text-muted-foreground">We’ll include your message, recent AI conversation if any, current page, and safe integration connection states. Passwords, tokens, cookies, and form contents are not included.</p><p className="mt-2 text-xs"><span className="font-medium">Current page:</span> <code className="break-all text-muted-foreground">{location.pathname}</code></p></div>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Subject</span><Input value={subject} maxLength={200} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="general_help">General help</option><option value="bug">Report a problem</option><option value="account_access">Account access</option><option value="integrations">Integrations</option><option value="billing">Billing</option><option value="feature_request">Feature request</option><option value="other">Other</option></select></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Message</span><Textarea rows={5} maxLength={10000} value={handoffMessage} onChange={(event) => setHandoffMessage(event.target.value)} placeholder="Tell us what happened and what you already tried." /></label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs"><Paperclip className="h-4 w-4" />Attach evidence <input className="ml-auto max-w-40 text-xs" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /></label>
          {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} file(s) selected. Files are stored privately and downloaded through Admiino.</p>}
          <label className="flex items-start gap-2 rounded-lg bg-primary/[0.04] p-3 text-xs"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" /><span>I reviewed this request and agree to send the message and recent AI conversation to Admiino Support.</span></label>
          <Button className="w-full" disabled={!confirmed || sending || !subject.trim() || !handoffMessage.trim()} onClick={() => void createTicket()}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send to Customer Support</Button>
        </div>}
        {view === "requests" && <div className="space-y-3">{loadingTickets ? <div className="space-y-2">{[1, 2, 3].map((key) => <div key={key} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div> : tickets.length ? tickets.map((item) => <button key={item.id} onClick={() => void openTicket(item)} className="w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-primary">{item.ticketNumber}</span><Badge className={STATUS_STYLE[item.status]}>{STATUS_LABEL[item.status] || item.status}</Badge></div><p className="mt-2 truncate text-sm font-medium">{item.subject}</p><p className="mt-1 text-xs text-muted-foreground">{item.category.replaceAll("_", " ")} · Updated {new Date(item.updatedAt).toLocaleDateString()}</p>{item.unread && <span className="mt-2 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">New support reply</span>}</button>) : <div className="rounded-2xl border border-dashed p-6 text-center"><TicketCheck className="mx-auto h-8 w-8 text-muted-foreground/60" /><p className="mt-3 text-sm font-medium">No support requests yet</p><p className="mt-1 text-xs text-muted-foreground">If you need a person, send a request and follow the conversation here.</p><Button size="sm" className="mt-4" onClick={() => beginEscalation()}>Contact support</Button></div>}</div>}
        {view === "ticket" && ticket && <div className="space-y-4"><div className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-primary">{ticket.ticketNumber}</span><Badge className={STATUS_STYLE[ticket.status]}>{STATUS_LABEL[ticket.status] || ticket.status}</Badge></div><h3 className="mt-2 text-sm font-semibold">{ticket.subject}</h3><p className="mt-1 text-xs capitalize text-muted-foreground">{ticket.category.replaceAll("_", " ")}</p></div>
          <div className="space-y-3">{ticket.messages?.map((message) => <div key={message.id} className={`rounded-xl p-3 text-sm ${message.authorType === "user" ? "ml-8 bg-primary text-primary-foreground" : message.authorType === "system" ? "border bg-muted/40 text-center text-xs text-muted-foreground" : "mr-6 bg-muted/70"}`}><p className="mb-1 text-[10px] font-semibold uppercase opacity-70">{message.authorType === "user" ? "You" : message.authorType === "system" ? "Update" : "Admiino Support"}</p><p className="whitespace-pre-wrap">{message.content}</p><div className="mt-1 text-right text-[10px] opacity-60">{new Date(message.createdAt).toLocaleString()}</div>{message.attachments?.map((attachment) => <button key={attachment.downloadUrl} onClick={() => void api.downloadSupportAttachment(attachment.downloadUrl, attachment.fileName).catch(() => toast({ title: "Download failed", variant: "destructive" }))} className="mt-2 flex items-center gap-1 rounded border px-2 py-1 text-xs"><Paperclip className="h-3 w-3" />{attachment.fileName}</button>)}</div>)}</div>
          {ticket.status !== "closed" ? <div className="space-y-2 border-t pt-3"><Textarea aria-label="Reply to support" rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply…" /><div className="flex items-center justify-between gap-2"><label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground"><Paperclip className="h-4 w-4" />Attach<input className="max-w-36 text-xs" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /></label><Button size="sm" disabled={sending || !reply.trim()} onClick={() => void sendReply()}>{sending ? "Sending…" : "Send reply"}</Button></div></div> : <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">This request is closed. Create a new request if you need further help.</p>}
        </div>}
      </div>
      {view === "chat" && <div className="border-t p-3"><form onSubmit={(event) => { event.preventDefault(); void sendQuestion(); }} className="flex items-end gap-2"><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendQuestion(); } }} aria-label="Ask Admiino AI" rows={2} maxLength={2000} placeholder="Ask a question about Admiino…" className="min-h-12 resize-none" /><Button size="icon" type="submit" disabled={!question.trim() || sending} aria-label="Send question"><Send className="h-4 w-4" /></Button></form><button className="mt-2 text-xs font-medium text-primary underline underline-offset-2" onClick={() => beginEscalation()}>Contact a person</button></div>}
    </SheetContent></Sheet>
  </>;
}
