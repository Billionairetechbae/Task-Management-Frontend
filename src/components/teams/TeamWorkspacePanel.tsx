import { useEffect, useState } from "react";
import { Activity, ClipboardList, CornerDownRight, MessageSquare, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { api, Team, TeamMessage, TeamWorkspaceResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Props = { team: Team };
type Tab = "overview" | "discussion" | "assignments" | "activity";

const personName = (person?: { firstName?: string | null; lastName?: string | null } | null) => person ? `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Unknown user" : "Unknown user";
const personInitials = (person?: { firstName?: string | null; lastName?: string | null } | null) => person ? `${person.firstName?.charAt(0) || ""}${person.lastName?.charAt(0) || ""}`.toUpperCase() || "?" : "?";
const timeLabel = (value: string) => new Date(value).toLocaleString();

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

  const stats = workspace ? [
    { label: "Active assignments", value: workspace.activeAssignments.length, icon: ClipboardList },
    { label: "Active subtasks", value: workspace.workload.reduce((sum, item) => sum + item.activeSubtasks, 0), icon: Activity },
    { label: "Team activity", value: workspace.activity.length, icon: Users },
  ] : [];

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">Team workspace</h2>
          <p className="truncate text-xs text-muted-foreground">{team.name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Refresh team workspace" className="shrink-0 text-muted-foreground">
          <Activity className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <div className="border-b px-2 pt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="discussion" className="gap-1.5 text-xs"><MessageSquare className="h-3.5 w-3.5" /> Chat</TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" /> Tasks</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Activity</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-3">
          {loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading Team workspace...</p>}

          {!loading && workspace && (
            <>
              <TabsContent value="overview" className="mt-0 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {stats.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-lg border bg-muted/20 p-3">
                      <Icon className="mb-2 h-4 w-4 text-primary" />
                      <p className="text-2xl font-semibold leading-none">{value}</p>
                      <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {workspace.workload.length > 0 && (
                  <div className="rounded-lg border">
                    <p className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold">Workload</p>
                    <div className="divide-y">
                      {workspace.workload.map((item, index) => (
                        <div key={item.user?.id || index} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={item.user?.profilePictureUrl || undefined} alt={personName(item.user)} />
                              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{personInitials(item.user)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm">{personName(item.user)}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">{item.activeSubtasks} active</Badge>
                            {item.overdue > 0 && <Badge variant="destructive" className="text-[10px]">{item.overdue} late</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="discussion" className="mt-0">
                <div className="flex flex-col">
                  <div className="max-h-[440px] min-h-[220px] space-y-3 overflow-y-auto pr-1">
                    {workspace.messages.length === 0 ? (
                      <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                        <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Start the conversation with your team.</p>
                      </div>
                    ) : workspace.messages.map((item) => (
                      <div key={item.id} className={cn("group flex gap-2.5", item.parentMessageId && "ml-6")}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={item.user?.profilePictureUrl || undefined} alt={personName(item.user)} />
                          <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{personInitials(item.user)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 rounded-lg rounded-tl-none border bg-muted/30 px-3 py-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-xs font-semibold">{personName(item.user)}</p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{timeLabel(item.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{item.content}</p>
                          <button
                            type="button"
                            onClick={() => setReplyTo(item)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                          >
                            <CornerDownRight className="h-3 w-3" /> Reply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {replyTo && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md border-l-2 border-primary bg-muted px-3 py-1.5 text-xs">
                      <span className="truncate">Replying to {personName(replyTo.user)}</span>
                      <Button variant="ghost" size="sm" className="h-5 shrink-0 px-1 text-xs" onClick={() => setReplyTo(null)}>Cancel</Button>
                    </div>
                  )}

                  <div className="mt-2 rounded-lg border p-2">
                    <Textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Write a message to your team..."
                      rows={2}
                      className="resize-none border-0 p-1 shadow-none focus-visible:ring-0"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap gap-1">
                        {team.memberLinks?.slice(0, 4).map((link) => (
                          <Button
                            key={link.companyMemberId}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => {
                              setMentionedUserIds((current) => current.includes(link.companyMember.userId) ? current : [...current, link.companyMember.userId]);
                              setMessage((current) => `${current}${current ? " " : ""}@${link.companyMember?.user?.firstName || ""} ${link.companyMember?.user?.lastName || ""}`);
                            }}
                          >
                            @{link.companyMember?.user?.firstName}
                          </Button>
                        ))}
                      </div>
                      <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage} disabled={sending || !message.trim()} aria-label="Send Team message">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Mentions are limited to active Team participants.</p>
                </div>
              </TabsContent>

              <TabsContent value="assignments" className="mt-0 space-y-2">
                {workspace.activeAssignments.length === 0 ? (
                  <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">This Team has no active assignments.</p>
                ) : workspace.activeAssignments.map((task) => (
                  <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="text-xs text-muted-foreground">{task.status} · {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span>
                    </span>
                    <Badge variant="outline" className="shrink-0">{task.execution?.progressPercent === null || task.execution?.progressPercent === undefined ? "No subtasks" : `${task.execution.progressPercent}%`}</Badge>
                  </Link>
                ))}
              </TabsContent>

              <TabsContent value="activity" className="mt-0 space-y-3">
                {workspace.activity.length === 0 ? (
                  <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No Team activity yet.</p>
                ) : workspace.activity.map((item) => (
                  <div key={item.id} className="relative flex gap-3 pl-1">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span className="w-px flex-1 bg-border" />
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-sm font-medium capitalize">{item.actionType.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{personName(item.user)} · {timeLabel(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </section>
  );
}
