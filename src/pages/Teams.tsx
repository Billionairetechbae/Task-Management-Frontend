import { useEffect, useMemo, useState } from "react";
import { useMatch, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  CheckSquare,
  Clock3,
  Crown,
  ExternalLink,
  FileText,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SubtaskList from "@/components/tasks/SubtaskList";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  api,
  CompanyMember,
  CreateTaskData,
  Task,
  TaskActivity,
  TaskComment,
  TaskPriority,
  TaskStatus,
  TaskSubtask,
  Team,
  TeamMemberLink,
  TeamMessage,
  TeamWorkspaceResponse,
} from "@/lib/api";
import { taskWorkbenchPath, teamSubtaskPath, teamTaskPath } from "@/lib/taskExecutionRoutes";
import { canManageWorkspace } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type TeamTab = "overview" | "tasks" | "chat" | "activity" | "settings";
type DialogMode = "members" | "lead" | "edit" | "create" | null;
type DueFilter = "all" | "overdue" | "today" | "week" | "none";
type SortKey = "due" | "priority" | "status" | "updated" | "created" | "title";

const statuses: TaskStatus[] = ["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
const nameOf = (member?: CompanyMember | null) =>
  member?.user ? `${member.user.firstName} ${member.user.lastName}`.trim() : "Unassigned";
const initials = (value?: string | null) =>
  (value || "Team").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
const personInitials = (member?: CompanyMember | null) => initials(nameOf(member));
const userName = (user?: { firstName?: string | null; lastName?: string | null } | null) =>
  user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown member" : "Unassigned";
const statusLabel = (status?: string | null) =>
  ({ pending: "Pending", in_progress: "In Progress", in_review: "In Review", completed: "Completed", delayed: "Delayed", cancelled: "Cancelled" } as Record<string, string>)[status || ""] || "Pending";
const priorityLabel = (priority?: string | null) =>
  priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : "Medium";
const formattedDate = (value?: string | null) => {
  if (!value) return "No due date";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "No due date"
    : new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
};
const dateInputValue = (value?: string | null) => value ? value.slice(0, 10) : "";
const dateValue = (value: string) => value ? new Date(`${value}T12:00:00`).toISOString() : null;
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const isOverdue = (task: Pick<Task, "deadline" | "status">) =>
  !!task.deadline && new Date(task.deadline).getTime() < new Date(new Date().toDateString()).getTime()
  && task.status !== "completed" && task.status !== "cancelled";
const taskAssigneeId = (task: Task) => task.assigneeId || task.assignee?.id || "";
const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = { in_progress: 0, in_review: 1, pending: 2, delayed: 3, completed: 4, cancelled: 5 };

/** Every /teams URL remains inside this mounted workspace shell. */
export default function Teams() {
  const subtaskMatch = useMatch("/teams/:teamId/tasks/:taskId/subtasks/:subtaskId");
  const taskMatch = useMatch("/teams/:teamId/tasks/:taskId");
  const routeTeamId = subtaskMatch?.params.teamId || taskMatch?.params.teamId;
  const taskId = subtaskMatch?.params.taskId || taskMatch?.params.taskId;
  const subtaskId = subtaskMatch?.params.subtaskId;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeCompanyId, user, workspaceRole } = useAuth();
  const { toast } = useToast();
  const canManage = canManageWorkspace(workspaceRole, user?.role);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [teamActionLoading, setTeamActionLoading] = useState(false);

  const selectedTeam = teams.find((team) => team.id === (routeTeamId || selectedId)) || null;
  const workspaceQuery = useQuery({
    queryKey: ["teams", "workspace", selectedTeam?.id],
    queryFn: () => api.getTeamWorkspace(selectedTeam!.id),
    enabled: !!selectedTeam,
    staleTime: 30_000,
    retry: false,
  });
  const teamTasksQuery = useQuery({
    queryKey: ["teams", "tasks", selectedTeam?.id],
    queryFn: () => api.getTasks({ teamId: selectedTeam!.id }),
    enabled: !!selectedTeam,
    staleTime: 30_000,
    retry: false,
  });
  const taskQuery = useQuery({
    queryKey: ["teams", "task", routeTeamId, taskId],
    queryFn: () => api.getTaskById(taskId!),
    enabled: !!routeTeamId && !!taskId,
    retry: false,
    staleTime: 30_000,
  });
  const subtaskQuery = useQuery({
    queryKey: ["teams", "subtask", subtaskId],
    queryFn: () => api.getTaskById(subtaskId!),
    enabled: !!subtaskId,
    retry: false,
  });
  const task = taskQuery.data?.data?.task;
  const taskAccess = taskQuery.data?.data?.access;
  const subtask = subtaskQuery.data?.data?.task;
  const [activeTab, setActiveTab] = useState<TeamTab>("overview");
  const openTask = !!routeTeamId && !!taskId;

  const loadTeams = async (showLoading = false) => {
    if (!activeCompanyId) {
      setTeams([]);
      setLoading(false);
      return;
    }
    try {
      if (showLoading) setLoading(true);
      const [teamResponse, memberResponse] = await Promise.all([
        api.listTeams(),
        canManage ? api.getCompanyTeam() : Promise.resolve({ data: { members: [] as CompanyMember[] } }),
      ]);
      const nextTeams = teamResponse.data.teams || [];
      setTeams(nextTeams);
      setMembers(memberResponse.data.members || []);
      setSelectedId((current) => routeTeamId || searchParams.get("team") || current || nextTeams[0]?.id || null);
    } catch (error) {
      toast({ title: "Could not load Teams", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams(true);
  }, [activeCompanyId, canManage]);

  useEffect(() => {
    if (!openTask) {
      const tab = searchParams.get("tab");
      setActiveTab(tab === "tasks" || tab === "chat" || tab === "activity" || tab === "settings" ? tab : "overview");
    }
  }, [searchParams, openTask]);

  useEffect(() => {
    if (!subtaskId) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate(`/teams/${routeTeamId}/tasks/${taskId}`);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [subtaskId, routeTeamId, taskId, navigate]);

  const chooseTeam = (team: Team) => {
    setSelectedId(team.id);
    navigate(`/teams?team=${team.id}`);
  };
  const teamMembers = selectedTeam?.memberLinks || [];
  const allMembers = [
    ...teamMembers.map((link) => link.companyMember),
    ...members.filter((member) => member.status === "active" && !teamMembers.some((link) => link.companyMemberId === member.id)),
  ].filter((member) => nameOf(member).toLowerCase().includes(memberSearch.toLowerCase()));

  const runTeamMutation = async (action: () => Promise<unknown>, success: string) => {
    try {
      setSaving(true);
      await action();
      toast({ title: success });
      setDialog(null);
      setMemberSearch("");
      await loadTeams();
      await workspaceQuery.refetch();
      await teamTasksQuery.refetch();
    } catch (error) {
      toast({ title: "Team update failed", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async () => {
    if (!selectedTeam) return;
    try {
      setTeamActionLoading(true);
      await api.deleteTeam(selectedTeam.id);
      setTeams((current) => current.filter((item) => item.id !== selectedTeam.id));
      setDeleteTeamOpen(false);
      setSelectedId(null);
      navigate("/teams");
      toast({ title: "Team deleted" });
      await loadTeams();
    } catch (error) {
      toast({ title: "Could not delete Team", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setTeamActionLoading(false);
    }
  };

  const refreshWorkspace = async () => {
    await Promise.all([workspaceQuery.refetch(), teamTasksQuery.refetch()]);
  };

  if (!activeCompanyId) {
    return <DashboardLayout><div className="p-6 text-sm text-muted-foreground">Choose a workspace to view Teams.</div></DashboardLayout>;
  }

  const workspace = workspaceQuery.data?.data;
  const currentTeam = workspace?.team || selectedTeam;
  const teamTasks = (teamTasksQuery.data?.data?.tasks || workspace?.activeAssignments || [])
    .filter((item) => !item.parentTaskId);
  const teamLeadUserId = currentTeam?.leadMember?.userId || currentTeam?.leadMember?.user?.id;
  const isTeamLead = !!user?.id && String(teamLeadUserId || "") === String(user.id);

  return (
    <DashboardLayout>
      <main className="flex h-[calc(100vh-var(--header-height,0px))] min-h-[560px] w-full overflow-hidden bg-[#f7f7fa]" data-testid="teams-workspace-shell">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r bg-background md:flex" aria-label="Teams navigator">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h1 className="text-sm font-semibold">Teams</h1>
              <p className="text-[11px] text-muted-foreground">{teams.length} workspace teams</p>
            </div>
            {canManage && (
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Create team" onClick={() => {
                setTeamName("");
                setTeamDescription("");
                setDialog("create");
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {loading ? <div className="space-y-2 p-2"><div className="h-10 animate-pulse rounded-md bg-muted" /><div className="h-10 animate-pulse rounded-md bg-muted" /></div> : teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => chooseTeam(team)}
                aria-current={selectedTeam?.id === team.id ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selectedTeam?.id === team.id ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-muted",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">{initials(team.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{team.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{team.memberLinks?.length || 0} members</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 border-b bg-background px-3 py-2 md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Choose Team"><Users className="mr-2 h-4 w-4" />{selectedTeam?.name || "Teams"}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {teams.map((team) => <DropdownMenuItem key={team.id} onSelect={() => chooseTeam(team)}>{team.name}</DropdownMenuItem>)}
                {canManage && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => { setTeamName(""); setTeamDescription(""); setDialog("create"); }}><Plus className="mr-2 h-4 w-4" />Create Team</DropdownMenuItem></>}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground">{teams.length} teams</span>
          </div>

          {!selectedTeam && !loading && <div className="p-8 text-sm text-muted-foreground">No teams are available in this workspace.</div>}
          {!selectedTeam && loading && <div className="space-y-3 p-5"><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-52 animate-pulse rounded-xl bg-muted" /></div>}
          {selectedTeam && !openTask && (
            <TeamHome
              team={currentTeam || selectedTeam}
              tasks={teamTasks}
              workspace={workspace}
              loading={workspaceQuery.isLoading || teamTasksQuery.isLoading}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              canManage={canManage}
              onOpenTask={(id) => navigate(teamTaskPath(selectedTeam.id, id))}
              onEdit={() => {
                setTeamName(selectedTeam.name);
                setTeamDescription(selectedTeam.description || "");
                setDialog("edit");
              }}
              onMembers={() => { setSelectedMemberIds([]); setDialog("members"); }}
              onLead={() => { setSelectedMemberIds([]); setDialog("lead"); }}
              onDelete={() => setDeleteTeamOpen(true)}
              onRefresh={() => void refreshWorkspace()}
              onTaskChanged={() => void refreshWorkspace()}
            />
          )}
          {openTask && selectedTeam && (
            <TaskWorkspace
              key={taskId}
              team={currentTeam || selectedTeam}
              tasks={teamTasks}
              task={task}
              loading={taskQuery.isLoading}
              taskError={taskQuery.isError}
              subtask={subtask}
              subtaskLoading={subtaskQuery.isLoading}
              subtaskError={subtaskQuery.isError}
              subtaskId={subtaskId}
              canEdit={canManage && !!taskAccess?.canEdit && taskAccess.readOnly !== true}
              canCollaborate={taskAccess?.canCollaborate === true}
              canCreateSubtasks={canManage || isTeamLead}
              canChangeSubtaskStatus={canManage || isTeamLead}
              userId={user?.id || ""}
              onClose={() => navigate(`/teams?team=${routeTeamId}&tab=tasks`)}
              onRefresh={() => taskQuery.refetch()}
              onRefreshWorkspace={refreshWorkspace}
              onTaskCreated={(created) => {
                void refreshWorkspace();
                if (created.id) navigate(teamTaskPath(selectedTeam.id, created.id));
              }}
              onSubtaskChanged={() => {
                void taskQuery.refetch();
                void queryClient.invalidateQueries({ queryKey: ["teams", "subtask"] });
              }}
            />
          )}
        </section>

        <TeamDialogs
          dialog={dialog}
          setDialog={setDialog}
          canManage={canManage}
          team={selectedTeam}
          teamMembers={teamMembers}
          allMembers={allMembers}
          selectedMemberIds={selectedMemberIds}
          setSelectedMemberIds={setSelectedMemberIds}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          teamName={teamName}
          setTeamName={setTeamName}
          teamDescription={teamDescription}
          setTeamDescription={setTeamDescription}
          saving={saving}
          save={runTeamMutation}
        />
        <AlertDialog open={deleteTeamOpen} onOpenChange={setDeleteTeamOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedTeam?.name}?</AlertDialogTitle>
              <AlertDialogDescription>This removes the Team and unassigns its work. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={teamActionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(event) => { event.preventDefault(); void deleteTeam(); }} disabled={teamActionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {teamActionLoading ? "Deleting…" : "Delete Team"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </DashboardLayout>
  );
}

function TeamHome({
  team, tasks, workspace, loading, activeTab, setActiveTab, canManage, onOpenTask, onEdit, onMembers, onLead, onDelete, onRefresh, onTaskChanged,
}: {
  team: Team;
  tasks: Task[];
  workspace?: TeamWorkspaceResponse;
  loading: boolean;
  activeTab: TeamTab;
  setActiveTab: (tab: TeamTab) => void;
  canManage: boolean;
  onOpenTask: (id: string) => void;
  onEdit: () => void;
  onMembers: () => void;
  onLead: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onTaskChanged: () => void;
}) {
  const completed = tasks.filter((task) => task.status === "completed").length;
  const overdue = tasks.filter(isOverdue).length;
  const activeCount = tasks.filter((task) => !["completed", "cancelled"].includes(task.status || "")).length;
  const tabs: Array<[TeamTab, string]> = [["overview", "Overview"], ["tasks", "Tasks"], ["chat", "Chat"], ["activity", "Activity"], ["settings", "Team settings"]];
  const openCount = tasks.filter((task) => !["completed", "cancelled"].includes(task.status || "")).length;

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 pt-4 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <Avatar className="h-11 w-11 rounded-xl">
              <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-bold text-primary">{initials(team.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight">{team.name}</h2>
              <p className="mt-0.5 max-w-2xl truncate text-xs text-muted-foreground">{team.description || "No description provided."}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {team.memberLinks?.slice(0, 5).map((link) => <Avatar key={link.id} className="h-6 w-6 border-2 border-background"><AvatarImage src={link.companyMember?.user?.profilePictureUrl || undefined} /><AvatarFallback className="text-[9px]">{personInitials(link.companyMember)}</AvatarFallback></Avatar>)}
                </div>
                <span className="text-[11px] text-muted-foreground">{team.memberLinks?.length || 0} members</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={onRefresh} aria-label="Refresh Team data"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh</Button>
            {canManage && <>
              <Button variant="outline" size="sm" onClick={onEdit}>Edit team</Button>
              <Button size="sm" onClick={onMembers}><Plus className="mr-1.5 h-4 w-4" />Add members</Button>
            </>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More Team actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManage && <>
                  <DropdownMenuItem onSelect={onEdit}>Edit Team</DropdownMenuItem>
                  <DropdownMenuItem onSelect={onMembers}>Manage members</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}><Trash2 className="mr-2 h-4 w-4" />Delete Team</DropdownMenuItem>
                </>}
                {!canManage && <DropdownMenuItem disabled>Team actions are managed by workspace admins</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
          <Metric label="Active tasks" value={activeCount} icon={CheckSquare} />
          <Metric label="Completed" value={completed} icon={Check} />
          <Metric label="Overdue" value={overdue} icon={Clock3} />
          <Metric label="Members" value={team.memberLinks?.length || 0} icon={Users} />
        </div>
        <nav className="flex gap-5 overflow-x-auto" aria-label="Team tabs">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={activeTab === value}
              onClick={() => setActiveTab(value)}
              className={cn("shrink-0 border-b-2 px-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", activeTab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {label}{value === "tasks" && <span className="ml-1.5 text-[10px] text-muted-foreground">{openCount}</span>}
            </button>
          ))}
        </nav>
      </header>

      <div className="p-4 sm:p-5">
        {loading ? <div className="space-y-3"><div className="h-32 animate-pulse rounded-lg bg-muted" /><div className="h-48 animate-pulse rounded-lg bg-muted" /></div> : (
          <>
            {activeTab === "overview" && <Overview team={team} tasks={tasks} workspace={workspace} onOpenTask={onOpenTask} onMembers={onMembers} onLead={onLead} />}
            {activeTab === "tasks" && <TeamTaskList team={team} tasks={tasks} canManage={canManage} onOpenTask={onOpenTask} onTaskChanged={onTaskChanged} />}
            {activeTab === "chat" && <TeamChat team={team} initialMessages={workspace?.messages || []} />}
            {activeTab === "activity" && <ActivityTimeline items={workspace?.activity || []} />}
            {activeTab === "settings" && <TeamSettings team={team} canManage={canManage} onEdit={onEdit} onLead={onLead} onMembers={onMembers} onDelete={onDelete} />}
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CheckSquare }) {
  return <div className="flex min-h-16 items-center gap-2.5 rounded-lg border bg-background px-3 py-2">
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
    <div><p className="text-lg font-semibold leading-none">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{label}</p></div>
  </div>;
}

function Overview({ team, tasks, workspace, onOpenTask, onMembers, onLead }: {
  team: Team; tasks: Task[]; workspace?: TeamWorkspaceResponse; onOpenTask: (id: string) => void; onMembers: () => void; onLead: () => void;
}) {
  const active = tasks.filter((task) => !["completed", "cancelled"].includes(task.status || ""));
  const lead = team.leadMember;
  const recentTasks = [...tasks].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).slice(0, 5);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
      <section className="overflow-hidden rounded-lg border bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div><h3 className="text-sm font-semibold">Team workload</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Active work by assigned member</p></div>
          <Badge variant="secondary">{active.length} active</Badge>
        </div>
        {workspace?.workload?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2.5 font-medium">Member</th><th className="px-3 py-2.5 font-medium">Active tasks</th><th className="px-3 py-2.5 font-medium">Overdue</th><th className="px-3 py-2.5 font-medium">Nearest due</th></tr></thead>
              <tbody className="divide-y">
                {workspace.workload.map((item, index) => <tr key={item.user?.id || index} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarImage src={item.user?.profilePictureUrl || undefined} /><AvatarFallback className="text-[9px]">{initials(userName(item.user))}</AvatarFallback></Avatar><span className="font-medium">{userName(item.user)}</span></div></td>
                  <td className="px-3 py-2.5">{item.activeSubtasks}</td>
                  <td className="px-3 py-2.5">{item.overdue ? <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{item.overdue}</Badge> : <span className="text-muted-foreground">0</span>}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formattedDate(item.nearestDueDate)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="px-4 py-8 text-center text-xs text-muted-foreground">No active workload has been reported for this Team.</p>}
      </section>
      <div className="space-y-4">
        <section className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Team lead</h3><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={onLead}>Change Lead</Button></div>
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar className="h-9 w-9"><AvatarImage src={lead?.user?.profilePictureUrl || undefined} /><AvatarFallback>{personInitials(lead)}</AvatarFallback></Avatar>
            <div className="min-w-0"><p className="truncate text-xs font-medium">{nameOf(lead)}</p><p className="truncate text-[11px] text-muted-foreground">{lead?.user?.email || "No Team Lead assigned"}</p></div>
          </div>
        </section>
        <section className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Members</h3><Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onMembers}>Manage</Button></div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {team.memberLinks?.slice(0, 8).map((link) => <Badge key={link.id} variant="secondary" className="gap-1.5 py-1 font-normal"><Avatar className="h-4 w-4"><AvatarImage src={link.companyMember?.user?.profilePictureUrl || undefined} /><AvatarFallback className="text-[7px]">{personInitials(link.companyMember)}</AvatarFallback></Avatar>{nameOf(link.companyMember)}</Badge>)}
            {!team.memberLinks?.length && <p className="text-xs text-muted-foreground">No active Team members.</p>}
            {(team.memberLinks?.length || 0) > 8 && <Badge variant="outline">+{team.memberLinks!.length - 8} more</Badge>}
          </div>
        </section>
        <section className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3"><h3 className="text-sm font-semibold">Recently updated tasks</h3></div>
          {recentTasks.length ? recentTasks.slice(0, 4).map((task) => <button key={task.id} type="button" onClick={() => task.id && onOpenTask(task.id)} className="flex w-full items-center justify-between gap-2 border-b px-4 py-2.5 text-left last:border-0 hover:bg-muted/30">
            <span className="min-w-0"><span className="block truncate text-xs font-medium">{task.title}</span><span className="text-[10px] text-muted-foreground">{formattedDate(task.updatedAt || task.createdAt)}</span></span>
            <Badge variant="outline" className="shrink-0 text-[10px]">{statusLabel(task.status)}</Badge>
          </button>) : <p className="px-4 py-6 text-center text-xs text-muted-foreground">No Team tasks yet.</p>}
        </section>
      </div>
    </div>
  );
}

function TeamTaskList({ team, tasks, canManage, onOpenTask, onTaskChanged }: {
  team: Team; tasks: Task[]; canManage: boolean; onOpenTask: (id: string) => void; onTaskChanged: () => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [assignee, setAssignee] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [descending, setDescending] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [mutatingId, setMutatingId] = useState("");
  const filtersCount = Number(status !== "all") + Number(priority !== "all") + Number(due !== "all") + Number(assignee !== "all");
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const startToday = new Date(new Date().toDateString()).getTime();
    const weekEnd = startToday + 7 * 24 * 60 * 60 * 1000;
    const selected = tasks.filter((task) => {
      const matchText = !query || [task.title, task.description, task.project?.name].some((text) => text?.toLocaleLowerCase().includes(query));
      const matchStatus = status === "all" || (status === "overdue" ? isOverdue(task) : task.status === status);
      const matchPriority = priority === "all" || task.priority === priority;
      const dueTime = task.deadline ? new Date(task.deadline).getTime() : null;
      const matchDue = due === "all"
        || (due === "overdue" && isOverdue(task))
        || (due === "today" && dueTime !== null && dueTime >= startToday && dueTime < startToday + 86_400_000)
        || (due === "week" && dueTime !== null && dueTime >= startToday && dueTime < weekEnd)
        || (due === "none" && dueTime === null);
      return matchText && matchStatus && matchPriority && matchDue && (assignee === "all" || taskAssigneeId(task) === assignee);
    });
    return selected.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "title") comparison = (a.title || "").localeCompare(b.title || "");
      if (sortBy === "due") comparison = (a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER) - (b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER);
      if (sortBy === "priority") comparison = (priorityOrder[a.priority || "medium"] ?? 2) - (priorityOrder[b.priority || "medium"] ?? 2);
      if (sortBy === "status") comparison = (statusOrder[a.status || "pending"] ?? 2) - (statusOrder[b.status || "pending"] ?? 2);
      if (sortBy === "updated") comparison = new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime();
      if (sortBy === "created") comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      return descending ? -comparison : comparison;
    });
  }, [tasks, search, status, priority, due, assignee, sortBy, descending]);

  const clearFilters = () => { setStatus("all"); setPriority("all"); setDue("all"); setAssignee("all"); };
  const markComplete = async (task: Task) => {
    if (!task.id) return;
    try {
      setMutatingId(task.id);
      await api.updateTask(task.id, { status: "completed" });
      toast({ title: "Task marked complete" });
      onTaskChanged();
    } catch (error) {
      toast({ title: "Could not update task", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setMutatingId("");
    }
  };
  const confirmDelete = async () => {
    if (!deleteTask?.id) return;
    try {
      setMutatingId(deleteTask.id);
      await api.deleteTask(deleteTask.id);
      toast({ title: "Task deleted" });
      setDeleteTask(null);
      onTaskChanged();
    } catch (error) {
      toast({ title: "Could not delete task", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setMutatingId("");
    }
  };
  const teamUsers = team.memberLinks?.map((link) => link.companyMember?.user).filter(Boolean) || [];
  const sortName: Record<SortKey, string> = { due: "Due date", priority: "Priority", status: "Status", updated: "Recently updated", created: "Created date", title: "Alphabetical" };

  return (
    <section className="overflow-hidden rounded-lg border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3">
        <div><h3 className="text-sm font-semibold">Tasks</h3><p className="mt-0.5 text-[11px] text-muted-foreground">{filteredTasks.length} of {tasks.length} Team tasks</p></div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input aria-label="Search Team tasks" className="h-8 w-[min(230px,65vw)] pl-8 pr-8 text-xs" placeholder="Search tasks…" value={search} onChange={(event) => setSearch(event.target.value)} />
            {search && <button type="button" aria-label="Clear task search" onClick={() => setSearch("")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8"><Filter className="mr-1.5 h-3.5 w-3.5" />Filter{filtersCount > 0 && <Badge className="ml-1 h-4 min-w-4 px-1 text-[9px]">{filtersCount}</Badge>}</Button></PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold">Filter tasks</p><Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={clearFilters}>Clear all</Button></div>
              <FilterSelect label="Status" value={status} onValueChange={setStatus} options={[["all", "All statuses"], ["pending", "Pending"], ["in_progress", "In Progress"], ["in_review", "In Review"], ["completed", "Completed"], ["overdue", "Overdue"], ["delayed", "Delayed"], ["cancelled", "Cancelled"]]} />
              <FilterSelect label="Priority" value={priority} onValueChange={setPriority} options={[["all", "All priorities"], ...priorities.map((item) => [item, priorityLabel(item)] as [string, string])]} />
              <FilterSelect label="Due" value={due} onValueChange={(value) => setDue(value as DueFilter)} options={[["all", "Any due date"], ["overdue", "Overdue"], ["today", "Today"], ["week", "This week"], ["none", "No due date"]]} />
              {teamUsers.length > 0 && <FilterSelect label="Assignee" value={assignee} onValueChange={setAssignee} options={[["all", "Anyone"], ...teamUsers.map((person) => [person!.id, userName(person)] as [string, string])]} />}
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8"><SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />Sort</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["due", "priority", "status", "updated", "created", "title"] as SortKey[]).map((key) => <DropdownMenuItem key={key} onSelect={() => setSortBy(key)}>{sortBy === key && <Check className="mr-2 h-3.5 w-3.5" />}{sortName[key]}</DropdownMenuItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDescending((value) => !value)}>{descending ? <ArrowDown className="mr-2 h-3.5 w-3.5" /> : <ArrowUp className="mr-2 h-3.5 w-3.5" />}{descending ? "Descending" : "Ascending"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New task</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(260px,1fr)_110px_90px_105px_100px_110px_38px] items-center border-b bg-muted/30 px-3 py-2 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Task</span><span>Status</span><span>Priority</span><span>Due</span><span>Progress</span><span>Updated</span><span />
          </div>
          {filteredTasks.length ? filteredTasks.map((task) => {
            const total = task.execution?.total ?? task.subtasks?.length ?? 0;
            const done = task.execution?.completed ?? task.subtasks?.filter((item) => item.status === "completed").length ?? 0;
            const progress = total ? Math.round(done / total * 100) : null;
            const canUpdateTask = canManage;
            return <div key={task.id} className="group relative grid grid-cols-[minmax(260px,1fr)_110px_90px_105px_100px_110px_38px] items-center border-b px-3 py-2.5 last:border-0 hover:bg-primary/[0.035]">
              <button type="button" aria-label={`Open task ${task.title}`} onClick={() => task.id && onOpenTask(task.id)} className="absolute inset-0 z-0 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" />
              <span className="pointer-events-none relative z-[1] min-w-0 pr-2"><span className="block truncate text-xs font-medium">{task.title}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{task.description || team.name}</span></span>
              <span className="relative z-[1] pointer-events-none"><Badge variant="outline" className="h-5 text-[9px]">{statusLabel(task.status)}</Badge></span>
              <span className="relative z-[1] pointer-events-none text-[10px] text-muted-foreground">{priorityLabel(task.priority)}</span>
              <span className={cn("relative z-[1] pointer-events-none text-[10px]", isOverdue(task) && "font-medium text-destructive")}>{formattedDate(task.deadline)}</span>
              <span className="relative z-[1] pointer-events-none flex items-center gap-1.5 text-[10px] text-muted-foreground">{progress === null ? "—" : <><Progress value={progress} className="h-1.5 w-12" />{done}/{total}</>}</span>
              <span className="relative z-[1] pointer-events-none text-[10px] text-muted-foreground">{formattedDate(task.updatedAt || task.createdAt)}</span>
              <div className="relative z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${task.title}`} disabled={mutatingId === task.id}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => task.id && onOpenTask(task.id)}><ExternalLink className="mr-2 h-3.5 w-3.5" />Open Team task</DropdownMenuItem>
                    <DropdownMenuItem disabled={!task.id || !canUpdateTask || task.status === "completed"} onSelect={() => void markComplete(task)}><Check className="mr-2 h-3.5 w-3.5" />Mark complete</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => task.id && navigate(taskWorkbenchPath(task.id))}><FileText className="mr-2 h-3.5 w-3.5" />Open in Task Workbench</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {canManage && <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteTask(task)}><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>;
          }) : <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">{search || filtersCount ? "No tasks match your search or filters." : "No Team tasks yet."}</p>
            <p className="mt-1 text-xs text-muted-foreground">{search || filtersCount ? "Try changing the search or clearing filters." : "Create a task to start organizing Team work."}</p>
            {filtersCount > 0 && <Button variant="link" size="sm" onClick={clearFilters}>Clear filters</Button>}
          </div>}
        </div>
      </div>
      <TaskCreateDialog team={team} open={createOpen} onOpenChange={setCreateOpen} onCreated={() => onTaskChanged()} />
      <AlertDialog open={!!deleteTask} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this task?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>Delete task</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function FilterSelect({ label, value, onValueChange, options }: {
  label: string; value: string; onValueChange: (value: string) => void; options: Array<[string, string]>;
}) {
  return <label className="block space-y-1.5"><span className="text-[10px] font-medium text-muted-foreground">{label}</span><Select value={value} onValueChange={onValueChange}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{options.map(([option, title]) => <SelectItem key={option} value={option}>{title}</SelectItem>)}</SelectContent></Select></label>;
}

function TaskCreateDialog({ team, open, onOpenChange, onCreated }: {
  team: Team; open: boolean; onOpenChange: (open: boolean) => void; onCreated: (task: Task) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const reset = () => { setTitle(""); setDescription(""); setPriority("medium"); setDeadline(""); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const payload: CreateTaskData = { title: title.trim(), description: description.trim(), priority, teamId: team.id };
    if (deadline) payload.deadline = dateValue(deadline) || undefined;
    try {
      setSaving(true);
      const response = await api.createTask(payload);
      const created = response.data.task;
      onOpenChange(false);
      reset();
      onCreated(created);
      toast({ title: "Task created", description: "Added to this Team." });
    } catch (error) {
      toast({ title: "Could not create task", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) reset(); onOpenChange(value); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>New Team task</DialogTitle><DialogDescription>This task will be assigned to {team.name}.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label htmlFor="new-team-task-title">Task name</Label><Input id="new-team-task-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1" required maxLength={255} /></div>
        <div><Label htmlFor="new-team-task-description">Description</Label><Textarea id="new-team-task-description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-20" /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1"><span className="text-sm font-medium">Priority</span><Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map((item) => <SelectItem key={item} value={item}>{priorityLabel(item)}</SelectItem>)}</SelectContent></Select></label>
          <label className="space-y-1"><span className="text-sm font-medium">Due date</span><Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !title.trim()}>{saving ? "Creating…" : "Create task"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function TeamChat({ team, initialMessages }: { team: Team; initialMessages: TeamMessage[] }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState(initialMessages);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  useEffect(() => setMessages(initialMessages), [initialMessages]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = message.trim();
    if (!content) return;
    try {
      setSending(true);
      const response = await api.postTeamMessage(team.id, { content, parentMessageId: replyTo?.id || null, mentionedUserIds });
      setMessages((current) => [...current, response.data.message]);
      setMessage("");
      setReplyTo(null);
      setMentionedUserIds([]);
    } catch (error) {
      toast({ title: "Could not send message", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };
  const addMention = (member: TeamMemberLink) => {
    const person = member.companyMember?.user;
    if (!person?.id) return;
    setMentionedUserIds((current) => current.includes(person.id) ? current : [...current, person.id]);
    setMessage((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@${person.firstName || ""} ${person.lastName || ""} `);
  };
  return (
    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3"><div><h3 className="text-sm font-semibold">Team chat</h3><p className="text-[11px] text-muted-foreground">{team.memberLinks?.length || 0} participants</p></div><MessageSquare className="h-4 w-4 text-primary" /></div>
      <div className="max-h-[calc(100vh-360px)] min-h-[260px] flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length ? messages.map((item) => (
          <article key={item.id} className={cn("flex gap-2.5", item.parentMessageId && "ml-8")}>
            <Avatar className="h-8 w-8 shrink-0"><AvatarImage src={item.user?.profilePictureUrl || undefined} /><AvatarFallback className="text-[10px]">{initials(userName(item.user))}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline gap-2"><span className="text-xs font-semibold">{userName(item.user)}</span><time className="text-[10px] text-muted-foreground">{formattedDateTime(item.createdAt)}</time></div>
              <div className="inline-block max-w-full rounded-xl rounded-tl-sm bg-muted/70 px-3 py-2 text-sm"><p className="whitespace-pre-wrap break-words">{item.content}</p></div>
              <Button type="button" variant="ghost" size="sm" className="ml-1 mt-0.5 h-6 px-2 text-[10px]" onClick={() => setReplyTo(item)}>Reply</Button>
            </div>
          </article>
        )) : <div className="flex min-h-[240px] flex-col items-center justify-center text-center"><MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/40" /><p className="text-sm font-medium">No messages yet</p><p className="mt-1 text-xs text-muted-foreground">Start the conversation with your Team.</p></div>}
      </div>
      <form onSubmit={send} className="sticky bottom-0 border-t bg-background p-3">
        {replyTo && <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5 text-[11px]"><span>Replying to {userName(replyTo.user)}</span><Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X className="h-3 w-3" /></Button></div>}
        <Textarea aria-label="Write a message" placeholder="Write a message…" value={message} onChange={(event) => setMessage(event.target.value)} rows={2} className="min-h-16 resize-y border-0 px-1 shadow-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(event); } }} />
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex max-w-[70%] gap-1 overflow-x-auto">{team.memberLinks?.slice(0, 5).map((member) => <Button type="button" variant="outline" size="sm" key={member.id} className="h-6 shrink-0 px-2 text-[10px]" onClick={() => addMention(member)}>@{member.companyMember?.user?.firstName}</Button>)}</div>
          <Button type="submit" size="sm" disabled={sending || !message.trim()}><Send className="mr-1.5 h-3.5 w-3.5" />{sending ? "Sending…" : "Send"}</Button>
        </div>
      </form>
    </section>
  );
}

function formattedDateTime(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(parsed);
}

function ActivityTimeline({ items }: { items: TaskActivity[] }) {
  return <section className="rounded-lg border bg-background">
    <div className="border-b px-4 py-3"><h3 className="text-sm font-semibold">Team activity</h3><p className="text-[11px] text-muted-foreground">Recent changes and events</p></div>
    {items.length ? <ol className="divide-y">{items.map((item) => {
      const target = typeof item.newValue === "object" && item.newValue && "title" in item.newValue ? String(item.newValue.title) : "";
      const action = item.actionType.replace(/_/g, " ");
      return <li key={item.id} className="flex gap-3 px-4 py-3">
        <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={item.user?.profilePictureUrl || undefined} /><AvatarFallback className="text-[9px]">{initials(userName(item.user))}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><p className="text-xs"><span className="font-medium">{userName(item.user)}</span> <span className="text-muted-foreground">{action}</span>{target && <> <span className="font-medium">“{target}”</span></>}</p><time className="mt-0.5 block text-[10px] text-muted-foreground">{formattedDateTime(item.createdAt)}</time></div>
        <Activity className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
      </li>;
    })}</ol> : <div className="px-4 py-12 text-center"><Activity className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" /><p className="text-sm font-medium">No Team activity yet</p><p className="mt-1 text-xs text-muted-foreground">Task and membership changes will appear here.</p></div>}
  </section>;
}

function TeamSettings({ team, canManage, onEdit, onLead, onMembers, onDelete }: {
  team: Team; canManage: boolean; onEdit: () => void; onLead: () => void; onMembers: () => void; onDelete: () => void;
}) {
  const settingCard = (title: string, children: React.ReactNode, action?: React.ReactNode) => <section className="rounded-lg border bg-background">
    <div className="flex items-center justify-between border-b px-4 py-3"><h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{action}</div><div className="p-4">{children}</div>
  </section>;
  return <div className="grid gap-3 lg:max-w-4xl">
    {settingCard("General", <div><p className="text-sm font-medium">{team.name}</p><p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{team.description || "No description provided."}</p></div>, canManage && <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>)}
    {settingCard("Leadership", <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /><div><p className="text-sm font-medium">{nameOf(team.leadMember)}</p><p className="text-[11px] text-muted-foreground">Team Lead</p></div></div>, canManage && <Button variant="outline" size="sm" onClick={onLead}>Change Lead</Button>)}
    {settingCard("Members", <div><p className="text-sm font-medium">{team.memberLinks?.length || 0} members</p><p className="mt-1 text-xs text-muted-foreground">Manage membership and remove inactive participants.</p></div>, canManage && <Button variant="outline" size="sm" onClick={onMembers}>Manage members</Button>)}
    {canManage && settingCard("Danger zone", <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Delete this Team</p><p className="mt-1 text-xs text-muted-foreground">Team work will be unassigned. This cannot be undone.</p></div><Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete Team</Button></div>)}
  </div>;
}

function TaskWorkspace({
  team, tasks, task, loading, taskError, subtask, subtaskLoading, subtaskError, subtaskId, canEdit, canCollaborate, canCreateSubtasks, canChangeSubtaskStatus, userId, onClose, onRefresh, onRefreshWorkspace, onTaskCreated, onSubtaskChanged,
}: {
  team: Team;
  tasks: Task[];
  task?: Task;
  loading: boolean;
  taskError: boolean;
  subtask?: Task;
  subtaskLoading: boolean;
  subtaskError: boolean;
  subtaskId?: string;
  canEdit: boolean;
  canCollaborate: boolean;
  canCreateSubtasks: boolean;
  canChangeSubtaskStatus: boolean;
  userId: string;
  onClose: () => void;
  onRefresh: () => Promise<unknown>;
  onRefreshWorkspace: () => Promise<void>;
  onTaskCreated: (task: Task) => void;
  onSubtaskChanged: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [subtaskFilter, setSubtaskFilter] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [taskSort, setTaskSort] = useState<SortKey>("updated");
  const [taskDescending, setTaskDescending] = useState(true);
  const activeSubtasks = task?.subtasks || [];
  const completed = activeSubtasks.filter((item) => item.status === "completed").length;
  const taskLookupResults = useMemo(() => {
    const query = taskSearch.trim().toLocaleLowerCase();
    return tasks.filter((candidate) => {
      const matchesText = !query || [candidate.title, candidate.description, candidate.project?.name]
        .some((value) => value?.toLocaleLowerCase().includes(query));
      return !candidate.parentTaskId
        && matchesText
        && (taskStatusFilter === "all" || candidate.status === taskStatusFilter)
        && (taskPriorityFilter === "all" || candidate.priority === taskPriorityFilter);
    }).sort((left, right) => {
      let comparison = 0;
      if (taskSort === "title") comparison = (left.title || "").localeCompare(right.title || "");
      if (taskSort === "due") comparison = (left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER) - (right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER);
      if (taskSort === "priority") comparison = (priorityOrder[left.priority || "medium"] ?? 2) - (priorityOrder[right.priority || "medium"] ?? 2);
      if (taskSort === "status") comparison = (statusOrder[left.status || "pending"] ?? 2) - (statusOrder[right.status || "pending"] ?? 2);
      if (taskSort === "updated") comparison = new Date(left.updatedAt || left.createdAt || 0).getTime() - new Date(right.updatedAt || right.createdAt || 0).getTime();
      if (taskSort === "created") comparison = new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
      return taskDescending ? -comparison : comparison;
    });
  }, [tasks, taskSearch, taskStatusFilter, taskPriorityFilter, taskSort, taskDescending]);
  const taskFilterCount = Number(taskStatusFilter !== "all") + Number(taskPriorityFilter !== "all");

  const updateParent = async (updates: Partial<Task>): Promise<boolean> => {
    if (!task?.id) return false;
    try {
      setSaving(true);
      await api.updateTask(task.id, updates);
      await onRefresh();
      toast({ title: "Task updated" });
      return true;
    } catch (error) {
      toast({ title: "Could not update task", description: errorMessage(error, "Please try again."), variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };
  const saveBrief = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await updateParent({ title: editTitle.trim(), description: editDescription })) setEditOpen(false);
  };
  const markComplete = () => void updateParent({ status: "completed" });
  const removeTask = async () => {
    if (!task?.id) return;
    try {
      setSaving(true);
      await api.deleteTask(task.id);
      setDeleteOpen(false);
      toast({ title: "Task deleted" });
      onClose();
      await onRefreshWorkspace();
    } catch (error) {
      toast({ title: "Could not delete task", description: errorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  const openEdit = () => {
    setEditTitle(task?.title || "");
    setEditDescription(task?.description || "");
    setEditOpen(true);
  };
  if (loading) return <div className="p-5"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="mt-4 h-56 animate-pulse rounded-lg bg-muted" /><div className="mt-3 h-72 animate-pulse rounded-lg bg-muted" /></div>;
  if (taskError || !task || String(task.teamId || "") !== String(team.id) || task.parentTaskId) {
    return <div className="p-6"><Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to tasks</Button><h2 className="mt-4 text-sm font-semibold">Team task not available</h2><p className="mt-1 text-xs text-muted-foreground">The task could not be loaded in this Team workspace.</p></div>;
  }

  const taskMembers = team.memberLinks?.map((link) => link.companyMember?.user).filter(Boolean) || [];
  return (
    <div className="flex min-h-full min-w-0 overflow-hidden">
      <section className={cn("min-w-0 flex-1 p-3 sm:p-5", subtaskId && "lg:max-w-[calc(100%-400px)]")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={onClose}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to tasks</Button>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                aria-label="Search Team tasks"
                placeholder="Search tasks…"
                value={taskSearch}
                onFocus={() => setTaskSearchOpen(true)}
                onChange={(event) => { setTaskSearch(event.target.value); setTaskSearchOpen(true); }}
                onKeyDown={(event) => { if (event.key === "Escape") setTaskSearchOpen(false); }}
                className="h-8 w-[min(210px,55vw)] pl-8 pr-8 text-xs"
              />
              {taskSearch && <button type="button" aria-label="Clear task search" onClick={() => { setTaskSearch(""); setTaskSearchOpen(false); }} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
              {taskSearchOpen && (taskSearch || taskFilterCount > 0) && <div className="absolute right-0 top-9 z-30 max-h-64 w-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                {taskLookupResults.length ? taskLookupResults.slice(0, 8).map((candidate) => <button key={candidate.id} type="button" className="block w-full rounded-sm px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { if (candidate.id) navigate(teamTaskPath(team.id, candidate.id)); setTaskSearch(""); setTaskSearchOpen(false); }}>
                  <span className="block truncate text-xs font-medium">{candidate.title}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{statusLabel(candidate.status)} · {priorityLabel(candidate.priority)}</span>
                </button>) : <p className="px-2.5 py-3 text-xs text-muted-foreground">No tasks match your search or filters.</p>}
              </div>}
            </div>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8"><Filter className="mr-1 h-3.5 w-3.5" />Filter{taskFilterCount > 0 && <Badge className="ml-1 h-4 min-w-4 px-1 text-[9px]">{taskFilterCount}</Badge>}</Button></PopoverTrigger>
              <PopoverContent align="end" className="w-60 space-y-3">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold">Filter Team tasks</p><Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => { setTaskStatusFilter("all"); setTaskPriorityFilter("all"); }}>Clear all</Button></div>
                <FilterSelect label="Status" value={taskStatusFilter} onValueChange={(value) => { setTaskStatusFilter(value); setTaskSearchOpen(true); }} options={[["all", "All statuses"], ...statuses.map((value) => [value, statusLabel(value)] as [string, string])]} />
                <FilterSelect label="Priority" value={taskPriorityFilter} onValueChange={(value) => { setTaskPriorityFilter(value); setTaskSearchOpen(true); }} options={[["all", "All priorities"], ...priorities.map((value) => [value, priorityLabel(value)] as [string, string])]} />
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8"><SlidersHorizontal className="mr-1 h-3.5 w-3.5" />Sort</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["due", "priority", "status", "updated", "created", "title"] as SortKey[]).map((key) => <DropdownMenuItem key={key} onSelect={() => { setTaskSort(key); setTaskSearchOpen(true); }}>{taskSort === key && <Check className="mr-2 h-3.5 w-3.5" />}{({ due: "Due date", priority: "Priority", status: "Status", updated: "Recently updated", created: "Created date", title: "Alphabetical" } as Record<SortKey, string>)[key]}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { setTaskDescending((value) => !value); setTaskSearchOpen(true); }}>{taskDescending ? <ArrowDown className="mr-2 h-3.5 w-3.5" /> : <ArrowUp className="mr-2 h-3.5 w-3.5" />}{taskDescending ? "Descending" : "Ascending"}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />New task</Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => void onRefresh()} aria-label="Refresh task"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh</Button>
          </div>
        </div>
        <article className="overflow-hidden rounded-lg border bg-background">
          <header className="border-b px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Team task</p><h2 className="mt-1 break-words text-xl font-semibold tracking-tight">{task.title}</h2><p className="mt-1 text-xs text-muted-foreground">Assigned to <span className="font-medium text-foreground">{team.name}</span></p></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More task actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={openEdit}>Edit task</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate(taskWorkbenchPath(task.id!))}><ExternalLink className="mr-2 h-3.5 w-3.5" />Open in Task Workbench</DropdownMenuItem>
                  <DropdownMenuItem disabled={saving || task.status === "completed"} onSelect={markComplete}><Check className="mr-2 h-3.5 w-3.5" />Mark complete</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-3.5 w-3.5" />Delete task</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canEdit ? <>
                <Select value={task.status || "pending"} onValueChange={(status) => void updateParent({ status: status as TaskStatus })} disabled={saving}><SelectTrigger aria-label="Task status" className="h-7 w-[130px] text-[11px]"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select>
                <Select value={task.priority || "medium"} onValueChange={(priority) => void updateParent({ priority: priority as TaskPriority })} disabled={saving}><SelectTrigger aria-label="Task priority" className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger><SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priorityLabel(priority)}</SelectItem>)}</SelectContent></Select>
                <label className="flex h-7 items-center gap-1.5 rounded-md border px-2"><CalendarDays className="h-3 w-3 text-muted-foreground" /><Input aria-label="Task due date" type="date" className="h-6 w-[125px] border-0 p-0 text-[10px] shadow-none" value={dateInputValue(task.deadline)} onChange={(event) => void updateParent({ deadline: dateValue(event.target.value) })} disabled={saving} /></label>
              </> : <>
                <Badge variant="outline">{statusLabel(task.status)}</Badge><Badge variant="outline">{priorityLabel(task.priority)}</Badge><Badge variant="outline">{formattedDate(task.deadline)}</Badge>
              </>}
              <span className="ml-auto text-[10px] text-muted-foreground">{task.attachments?.length || 0} files · {task.activities?.length || 0} activity events</span>
            </div>
          </header>
          <div className="space-y-4 p-3 sm:p-4">
            <section className="rounded-md border bg-muted/20 px-3 py-3">
              <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-semibold"><FileText className="h-3.5 w-3.5 text-primary" />Execution brief</h3>{canEdit && <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={openEdit}>Edit</Button>}</div>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{task.description || "No execution brief provided."}</p>
            </section>
            <section className="overflow-hidden rounded-md border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3">
                <div className="min-w-48 flex-1">
                  <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-semibold"><CheckSquare className="h-3.5 w-3.5 text-primary" />Sub-tasks <span className="font-normal text-muted-foreground">{completed}/{activeSubtasks.length} completed</span></h3><span className="text-[10px] text-muted-foreground">{activeSubtasks.length ? Math.round(completed / activeSubtasks.length * 100) : 0}%</span></div>
                  <Progress value={activeSubtasks.length ? completed / activeSubtasks.length * 100 : 0} className="mt-2 h-1.5 max-w-[280px]" />
                </div>
                <div className="relative w-full max-w-[210px]">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input aria-label="Search subtasks" placeholder="Search sub-tasks…" className="h-7 pl-7 pr-7 text-[11px]" value={subtaskFilter} onChange={(event) => setSubtaskFilter(event.target.value)} />
                  {subtaskFilter && <button type="button" aria-label="Clear subtask search" onClick={() => setSubtaskFilter("")} className="absolute right-1.5 top-1.5 text-muted-foreground"><X className="h-4 w-4" /></button>}
                </div>
              </div>
              <div className="p-2 sm:p-3">
                <SubtaskList
                  taskId={task.id!}
                  initialSubtasks={activeSubtasks.filter(Boolean)}
                  parentTeamId={task.teamId}
                  canEdit={canEdit}
                  canCreate={canCreateSubtasks}
                  canUpdate={(item) => String(item.assigneeId || "") === String(userId) || canChangeSubtaskStatus}
                  selectedSubtaskId={subtaskId}
                  subtaskLinkBuilder={(item) => teamSubtaskPath(team.id, task.id!, item.id)}
                  filterText={subtaskFilter}
                  onChanged={onSubtaskChanged}
                />
              </div>
            </section>
          </div>
        </article>
      </section>

      {subtaskId && <SubtaskInspector
        task={task}
        team={team}
        subtask={subtask}
        loading={subtaskLoading}
        error={subtaskError}
        canEdit={canEdit}
        canChangeStatus={canChangeSubtaskStatus || String(subtask?.assigneeId || "") === String(userId)}
        canComment={canEdit || canCollaborate}
        members={taskMembers}
        onClose={onClose}
        onChanged={onSubtaskChanged}
      />}
      <TaskCreateDialog team={team} open={createOpen} onOpenChange={setCreateOpen} onCreated={onTaskCreated} />
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Edit Team task</DialogTitle><DialogDescription>Update the task title and execution brief.</DialogDescription></DialogHeader>
          <form onSubmit={saveBrief} className="space-y-3"><div><Label htmlFor="team-task-title">Task title</Label><Input id="team-task-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="mt-1" required /></div><div><Label htmlFor="team-task-brief">Execution brief</Label><Textarea id="team-task-brief" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="mt-1 min-h-28" /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !editTitle.trim()}>{saving ? "Saving…" : "Save changes"}</Button></DialogFooter></form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this Team task?</AlertDialogTitle><AlertDialogDescription>Its subtasks will also be removed. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={saving} onClick={(event) => { event.preventDefault(); void removeTask(); }}>{saving ? "Deleting…" : "Delete task"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function SubtaskInspector({ task, team, subtask, loading, error, canEdit, canChangeStatus, canComment, members, onClose, onChanged }: {
  task: Task;
  team: Team;
  subtask?: Task;
  loading: boolean;
  error: boolean;
  canEdit: boolean;
  canChangeStatus: boolean;
  canComment: boolean;
  members: NonNullable<Team["memberLinks"]>[number]["companyMember"]["user"][];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState("notes");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState("");
  const commentableId = subtask?.id;
  useEffect(() => {
    if (tab !== "notes" || !commentableId) return;
    let cancelled = false;
    setCommentsLoading(true);
    setCommentsError("");
    api.getTaskComments(commentableId, { limit: 50 }).then((response) => {
      if (!cancelled) setComments(response.comments || []);
    }).catch((fetchError) => {
      if (!cancelled) setCommentsError(errorMessage(fetchError, "Could not load notes."));
    }).finally(() => {
      if (!cancelled) setCommentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [commentableId, tab]);

  const updateSubtask = async (updates: Partial<TaskSubtask>) => {
    if (!task.id || !subtask?.id) return;
    try {
      setSaving(true);
      await api.updateTaskSubtask(task.id, subtask.id, updates);
      onChanged();
    } catch (updateError) {
      toast({ title: "Could not update sub-task", description: errorMessage(updateError, "Please try again."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentableId || !commentText.trim()) return;
    try {
      setSending(true);
      const response = await api.addTaskComment(commentableId, commentText.trim());
      setComments((current) => [...current, response.comment]);
      setCommentText("");
    } catch (commentError) {
      toast({ title: "Could not add note", description: errorMessage(commentError, "Please try again."), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };
  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!subtask?.id || !files.length) return;
    try {
      setUploading(true);
      await api.uploadTaskAttachments(subtask.id, files);
      toast({ title: files.length === 1 ? "File uploaded" : "Files uploaded" });
      onChanged();
    } catch (uploadError) {
      toast({ title: "Could not upload file", description: errorMessage(uploadError, "Please try again."), variant: "destructive" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  const downloadFile = async (attachment: NonNullable<Task["attachments"]>[number]) => {
    if (!subtask?.id || !attachment.id) return;
    try {
      setDeletingAttachment(attachment.id);
      const result = await api.downloadTaskAttachment(subtask.id, attachment.id);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName || attachment.fileName || "attachment";
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      toast({ title: "Could not download file", description: errorMessage(downloadError, "Please try again."), variant: "destructive" });
    } finally {
      setDeletingAttachment("");
    }
  };
  const removeFile = async (attachmentId: string) => {
    try {
      setDeletingAttachment(attachmentId);
      await api.deleteTaskAttachment(attachmentId);
      onChanged();
    } catch (removeError) {
      toast({ title: "Could not remove file", description: errorMessage(removeError, "Please try again."), variant: "destructive" });
    } finally {
      setDeletingAttachment("");
    }
  };

  return (
    <aside className="fixed inset-0 z-40 flex w-full flex-col overflow-y-auto border-l bg-background p-4 shadow-2xl lg:static lg:z-auto lg:w-[400px] lg:shrink-0 lg:p-4" aria-label="Sub-task inspector">
      <header className="flex items-start justify-between gap-3 border-b pb-3">
        <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-primary">Sub-task</p><h2 className="mt-1 break-words text-lg font-semibold">{subtask?.title || (loading ? "Loading sub-task…" : "Sub-task unavailable")}</h2><p className="mt-1 truncate text-[10px] text-muted-foreground">Parent: {task.title} · {team.name}</p></div>
        <Button variant="ghost" size="icon" aria-label="Close sub-task inspector" onClick={onClose}><X className="h-4 w-4" /></Button>
      </header>
      {loading ? <div className="mt-4 space-y-3"><div className="h-24 animate-pulse rounded-lg bg-muted" /><div className="h-40 animate-pulse rounded-lg bg-muted" /></div> : error || !subtask || String(subtask.parentTaskId || "") !== String(task.id) ? <p className="py-8 text-center text-xs text-muted-foreground">This sub-task is unavailable in this Team context.</p> : <>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-b py-3">
          <MetadataField label="Assignee">{canEdit ? <Select value={subtask.assigneeId || "none"} onValueChange={(value) => void updateSubtask({ assigneeId: value === "none" ? null : value })} disabled={saving}><SelectTrigger aria-label="Sub-task assignee" className="h-8 text-[11px]"><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{members.map((person) => <SelectItem key={person.id} value={person.id}>{userName(person)}</SelectItem>)}</SelectContent></Select> : <p className="truncate text-xs">{userName(subtask.assignee)}</p>}</MetadataField>
          <MetadataField label="Due date">{canEdit ? <Input aria-label="Sub-task due date" type="date" className="h-8 text-[11px]" value={dateInputValue(subtask.deadline)} onChange={(event) => void updateSubtask({ deadline: dateValue(event.target.value) })} disabled={saving} /> : <p className="text-xs">{formattedDate(subtask.deadline)}</p>}</MetadataField>
          <MetadataField label="Priority">{canEdit ? <Select value={subtask.priority || "medium"} onValueChange={(value) => void updateSubtask({ priority: value as TaskPriority })} disabled={saving}><SelectTrigger aria-label="Sub-task priority" className="h-8 text-[11px]"><SelectValue /></SelectTrigger><SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priorityLabel(priority)}</SelectItem>)}</SelectContent></Select> : <p className="text-xs">{priorityLabel(subtask.priority)}</p>}</MetadataField>
          <MetadataField label="Status">{canChangeStatus ? <Select value={subtask.status || "pending"} onValueChange={(value) => void updateSubtask({ status: value as TaskStatus })} disabled={saving}><SelectTrigger aria-label="Sub-task status" className="h-8 text-[11px]"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select> : <p className="text-xs">{statusLabel(subtask.status)}</p>}</MetadataField>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="mt-3 flex min-h-0 flex-1 flex-col">
          <TabsList className="grid h-8 w-full grid-cols-3"><TabsTrigger value="notes" className="text-[11px]">Notes</TabsTrigger><TabsTrigger value="files" className="text-[11px]">Files <span className="ml-1">{subtask.attachments?.length || 0}</span></TabsTrigger><TabsTrigger value="activity" className="text-[11px]">Activity</TabsTrigger></TabsList>
          <TabsContent value="notes" className="mt-3 flex min-h-0 flex-1 flex-col">
            <div className="min-h-28 flex-1 space-y-3 overflow-y-auto">
              {commentsLoading && <p className="text-xs text-muted-foreground">Loading notes…</p>}
              {commentsError && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{commentsError}</div>}
              {!commentsLoading && !commentsError && comments.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No notes yet. Add context for the Team here.</p>}
              {comments.map((comment) => <div key={comment.id} className="flex gap-2"><Avatar className="h-7 w-7 shrink-0"><AvatarImage src={comment.user?.profilePictureUrl} /><AvatarFallback className="text-[9px]">{initials(userName(comment.user))}</AvatarFallback></Avatar><div className="min-w-0 flex-1 rounded-md bg-muted/50 px-2.5 py-2"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-medium">{userName(comment.user)}</span><time className="shrink-0 text-[9px] text-muted-foreground">{formattedDateTime(comment.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-xs">{comment.content}</p></div></div>)}
            </div>
            <form onSubmit={submitComment} className="mt-3 border-t pt-3"><Textarea aria-label="Write a note" placeholder="Add a note…" rows={2} className="min-h-16 resize-y text-xs" value={commentText} onChange={(event) => setCommentText(event.target.value)} /><div className="mt-2 flex justify-end"><Button type="submit" size="sm" className="h-7 text-[11px]" disabled={sending || !commentText.trim()}><Send className="mr-1.5 h-3 w-3" />{sending ? "Adding…" : "Add note"}</Button></div></form>
          </TabsContent>
          <TabsContent value="files" className="mt-3">
            <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{subtask.attachments?.length || 0} attachments</p>{canEdit && <label className="inline-flex cursor-pointer items-center"><input type="file" multiple className="sr-only" aria-label="Upload files" onChange={(event) => void uploadFiles(event)} disabled={uploading} /><Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><span><Paperclip className="mr-1.5 h-3 w-3" />{uploading ? "Uploading…" : "Upload"}</span></Button></label>}</div>
            {subtask.attachments?.length ? <div className="mt-3 divide-y rounded-md border">{subtask.attachments.map((file) => <div key={file.id} className="flex items-center gap-2 px-2.5 py-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-xs">{file.fileName}</span><Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => void downloadFile(file)} disabled={deletingAttachment === file.id}>{deletingAttachment === file.id ? "Working…" : "Download"}</Button>{canEdit && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label={`Remove ${file.fileName}`} onClick={() => void removeFile(file.id)} disabled={deletingAttachment === file.id}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>)}</div> : <p className="py-10 text-center text-xs text-muted-foreground">No files attached to this sub-task.</p>}
          </TabsContent>
          <TabsContent value="activity" className="mt-3">
            {subtask.activities?.length ? <ol className="space-y-3">{[...subtask.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item) => <li key={item.id} className="flex gap-2.5"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><p className="text-xs"><span className="font-medium">{userName(item.user)}</span> <span className="text-muted-foreground">{item.actionType.replace(/_/g, " ")}</span></p><time className="text-[10px] text-muted-foreground">{formattedDateTime(item.createdAt)}</time></div></li>)}</ol> : <p className="py-10 text-center text-xs text-muted-foreground">No activity for this sub-task yet.</p>}
          </TabsContent>
        </Tabs>
      </>}
    </aside>
  );
}

function MetadataField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="min-w-0 space-y-1"><span className="block text-[10px] font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function TeamDialogs({
  dialog, setDialog, canManage, team, teamMembers, allMembers, selectedMemberIds, setSelectedMemberIds, memberSearch, setMemberSearch, teamName, setTeamName, teamDescription, setTeamDescription, saving, save,
}: {
  dialog: DialogMode;
  setDialog: (dialog: DialogMode) => void;
  canManage: boolean;
  team: Team | null;
  teamMembers: TeamMemberLink[];
  allMembers: CompanyMember[];
  selectedMemberIds: string[];
  setSelectedMemberIds: React.Dispatch<React.SetStateAction<string[]>>;
  memberSearch: string;
  setMemberSearch: (value: string) => void;
  teamName: string;
  setTeamName: (value: string) => void;
  teamDescription: string;
  setTeamDescription: (value: string) => void;
  saving: boolean;
  save: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  if (!team && dialog !== "create") return null;
  const toggle = (id: string) => setSelectedMemberIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const isMember = (id: string) => teamMembers.some((link) => link.companyMemberId === id);
  const leadSelected = !!team?.leadMemberId && selectedMemberIds.includes(team.leadMemberId);
  const currentLead = team?.leadMemberId || undefined;
  const reset = () => { setSelectedMemberIds([]); setMemberSearch(""); };
  return (
    <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) { setDialog(null); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{dialog === "members" ? "Manage members" : dialog === "lead" ? "Change Team Lead" : dialog === "create" ? "Create Team" : "Edit Team"}</DialogTitle><DialogDescription>{dialog === "members" ? "Search workspace members and select who should belong to this Team." : dialog === "lead" ? "Only active Team members can become Team Lead." : dialog === "create" ? "Create a Team in the current workspace." : "Update this Team's name and description."}</DialogDescription></DialogHeader>
        {(dialog === "create" || dialog === "edit") && <div className="space-y-3"><div><Label htmlFor="team-name">Team name</Label><Input id="team-name" className="mt-1" value={teamName} onChange={(event) => setTeamName(event.target.value)} maxLength={120} /></div><div><Label htmlFor="team-description">Description</Label><Textarea id="team-description" className="mt-1" value={teamDescription} onChange={(event) => setTeamDescription(event.target.value)} /></div></div>}
        {dialog === "lead" && <Select value={selectedMemberIds[0] || "none"} onValueChange={(value) => setSelectedMemberIds(value === "none" ? [] : [value])}><SelectTrigger aria-label="Select Team Lead"><SelectValue placeholder="Select a Team member" /></SelectTrigger><SelectContent><SelectItem value="none">Select a member</SelectItem>{teamMembers.map((link) => <SelectItem key={link.companyMemberId} value={link.companyMemberId}>{nameOf(link.companyMember)}</SelectItem>)}</SelectContent></Select>}
        {dialog === "members" && <div className="space-y-3"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input autoFocus aria-label="Search workspace members" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search workspace members…" className="pl-8" /></div><div className="max-h-72 divide-y overflow-y-auto rounded-md border">{allMembers.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/50"><input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={() => toggle(member.id)} disabled={member.id === currentLead && isMember(member.id)} aria-label={`${isMember(member.id) ? "Remove" : "Add"} ${nameOf(member)}`} /><Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{personInitials(member)}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate text-xs font-medium">{nameOf(member)}</span><span className="text-[10px] text-muted-foreground">{isMember(member.id) ? "In Team" : "Available"}</span></label>)}{!allMembers.length && <p className="p-5 text-center text-xs text-muted-foreground">No matching workspace members.</p>}</div></div>}
        <DialogFooter className="flex-wrap sm:justify-between">
          <Button type="button" variant="outline" onClick={() => { setDialog(null); reset(); }}>Cancel</Button>
          {canManage && dialog === "lead" && <Button disabled={saving || !selectedMemberIds[0]} onClick={() => team && void save(() => api.assignTeamLead(team.id, selectedMemberIds[0], { expectedCurrentLeadMemberId: team.leadMemberId || undefined, confirmTransfer: true }), "Team Lead updated")}>{saving ? "Saving…" : "Save Lead"}</Button>}
          {canManage && dialog === "members" && <>
            <Button variant="outline" disabled={saving || !selectedMemberIds.some(isMember) || leadSelected} onClick={() => team && void save(() => api.removeTeamMembers(team.id, selectedMemberIds.filter(isMember)), "Members removed")}>Remove selected</Button>
            <Button disabled={saving || !selectedMemberIds.some((id) => !isMember(id))} onClick={() => team && void save(() => api.addTeamMembers(team.id, selectedMemberIds.filter((id) => !isMember(id))), "Members added")}>{saving ? "Saving…" : "Add selected"}</Button>
          </>}
          {canManage && (dialog === "create" || dialog === "edit") && <Button disabled={saving || !teamName.trim()} onClick={() => void save(() => dialog === "create" ? api.createTeam({ name: teamName.trim(), description: teamDescription.trim() || undefined }) : team && api.updateTeam(team.id, { name: teamName.trim(), description: teamDescription.trim() || null }), dialog === "create" ? "Team created" : "Team updated")}>{saving ? "Saving…" : "Save changes"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
