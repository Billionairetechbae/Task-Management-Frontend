import { useEffect, useState } from "react";
import { Activity, ClipboardList, MessageSquare, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { api, Team, TeamMessage, TeamWorkspaceResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Props = { team: Team };
type Tab = "overview" | "discussion" | "assignments" | "activity";

const personName = (person?: { firstName?: string | null; lastName?: string | null } | null) => person ? `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unknown user" : "Unknown user";

export default function TeamWorkspacePanel({ team }: Props) {
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<TeamWorkspaceResponse | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.getTeamWorkspace(team.id);
      setWorkspace(response.data);
    } catch (error: any) {
      toast({ title: "Could not load Team workspace", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [team.id]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      setSending(true);
      await api.postTeamMessage(team.id, { content: message.trim(), parentMessageId: replyTo?.id || null, mentionedUserIds });
      setMessage("");
      setMentionedUserIds([]);
      setReplyTo(null);
      await load();
    } catch (error: any) {
      toast({ title: "Could not send message", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
    { id: "overview", label: "Overview", icon: Users },
    { id: "discussion", label: "Discussion", icon: MessageSquare },
    { id: "assignments", label: "Assignments", icon: ClipboardList },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b px-3 py-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button key={id} variant={tab === id ? "secondary" : "ghost"} size="sm" className="gap-2" onClick={() => setTab(id)}>
            <Icon className="h-4 w-4" /> {label}
          </Button>
        ))}
      </div>
      <div className="p-4">
        {loading && <p className="text-sm text-muted-foreground">Loading Team workspace...</p>}
        {!loading && workspace && tab === "overview" && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Active assignments</p><p className="mt-1 text-2xl font-semibold">{workspace.activeAssignments.length}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Active subtask assignments</p><p className="mt-1 text-2xl font-semibold">{workspace.workload.reduce((sum, item) => sum + item.activeSubtasks, 0)}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Team activity</p><p className="mt-1 text-2xl font-semibold">{workspace.activity.length}</p></div>
          </div>
        )}
        {!loading && workspace && tab === "discussion" && (
          <div className="space-y-3">
            {workspace.messages.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No Team messages yet.</p> : workspace.messages.map((item) => (
              <div key={item.id} className={`rounded-md border p-3 ${item.parentMessageId ? "ml-6" : ""}`}>
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{personName(item.user)}</p><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{item.content}</p>
                <Button variant="ghost" size="sm" className="mt-1 h-7 px-1 text-xs" onClick={() => setReplyTo(item)}>Reply</Button>
              </div>
            ))}
            {replyTo && <div className="rounded-md bg-muted px-3 py-2 text-xs">Replying to {personName(replyTo.user)} <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setReplyTo(null)}>Cancel</Button></div>}
            <div className="flex gap-2"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a Team message..." rows={2} /><Button size="icon" onClick={sendMessage} disabled={sending || !message.trim()} aria-label="Send Team message"><Send className="h-4 w-4" /></Button></div>
            {team.memberLinks && team.memberLinks.length > 0 && <div className="flex flex-wrap gap-1">{team.memberLinks.map((link) => <Button key={link.companyMemberId} type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => { setMentionedUserIds((current) => current.includes(link.companyMember.userId) ? current : [...current, link.companyMember.userId]); setMessage((current) => `${current}${current ? " " : ""}@${link.companyMember?.user?.firstName || ""} ${link.companyMember?.user?.lastName || ""}`); }}>@{link.companyMember?.user?.firstName}</Button>)}</div>}
            <p className="text-xs text-muted-foreground">Mentions are limited to active Team participants.</p>
          </div>
        )}
        {!loading && workspace && tab === "assignments" && (
          <div className="space-y-2">{workspace.activeAssignments.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">This Team has no active assignments.</p> : workspace.activeAssignments.map((task) => <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50"><span className="min-w-0"><span className="block truncate text-sm font-medium">{task.title}</span><span className="text-xs text-muted-foreground">{task.status} · {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span></span><Badge variant="outline">{task.execution?.progressPercent === null || task.execution?.progressPercent === undefined ? "No subtasks" : `${task.execution.progressPercent}%`}</Badge></Link>)}</div>
        )}
        {!loading && workspace && tab === "activity" && (
          <div className="space-y-2">{workspace.activity.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No Team activity yet.</p> : workspace.activity.map((item) => <div key={item.id} className="rounded-md border p-3"><p className="text-sm font-medium">{item.actionType.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{personName(item.user)} · {new Date(item.createdAt).toLocaleString()}</p></div>)}</div>
        )}
      </div>
    </section>
  );
}
