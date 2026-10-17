import {
  Activity, Bell, CalendarDays, Columns3, FileText, FolderKanban, FolderOpen,
  LayoutDashboard, LayoutTemplate, Plug, Settings, ShieldCheck, Trash2, User,
  Users, ClipboardList, type LucideIcon,
} from "lucide-react";

export type SearchNavigationResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  category: "Navigation" | "Settings";
  icon: LucideIcon;
};

type Entry = SearchNavigationResult & { aliases: string[]; roles?: string[]; permission?: string };
const entries: Entry[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Your workspace overview and recent work", href: "/dashboard", category: "Navigation", icon: LayoutDashboard, aliases: ["home", "overview"] },
  { id: "calendar", title: "Calendar", subtitle: "View tasks and deadlines by date", href: "/calendar", category: "Navigation", icon: CalendarDays, aliases: ["dates", "deadlines"] },
  { id: "board", title: "Board", subtitle: "View work on a status board", href: "/board", category: "Navigation", icon: Columns3, aliases: ["kanban"] },
  { id: "drive", title: "Files & Drive", subtitle: "Browse Admiino files and connected storage", href: "/drive", category: "Navigation", icon: FileText, aliases: ["drive", "files"] },
  { id: "integrations", title: "Integrations", subtitle: "Manage Google, Dropbox and connected services", href: "/settings/integrations", category: "Settings", icon: Plug, aliases: ["integration", "google", "dropbox"] },
  { id: "settings", title: "Settings", subtitle: "Manage your account and app preferences", href: "/settings", category: "Settings", icon: Settings, aliases: ["preferences"] },
  { id: "notifications", title: "Notifications", subtitle: "Updates and notification preferences", href: "/notifications", category: "Navigation", icon: Bell, aliases: ["alerts"] },
  { id: "profile", title: "Profile", subtitle: "View and update your account profile", href: "/profile", category: "Settings", icon: User, aliases: ["account"] },
  { id: "templates", title: "Templates", subtitle: "Browse reusable task and project templates", href: "/templates", category: "Navigation", icon: LayoutTemplate, aliases: ["template"], roles: ["owner", "admin", "manager"] },
  { id: "projects", title: "Projects", subtitle: "Browse projects in this workspace", href: "/projects", category: "Navigation", icon: FolderKanban, aliases: ["project"] },
  { id: "tasks", title: "Tasks", subtitle: "Browse tasks in this workspace", href: "/tasks/all", category: "Navigation", icon: ClipboardList, aliases: ["task", "all tasks"] },
  { id: "workbench", title: "Task Workbench", subtitle: "Review and manage task workflows", href: "/tasks/workbench", category: "Navigation", icon: ClipboardList, aliases: ["task workbench", "workbench"], roles: ["owner", "admin", "manager"] },
  { id: "teams", title: "Teams", subtitle: "View teams and team workspaces", href: "/teams", category: "Navigation", icon: Users, aliases: ["team"], permission: "view_workspace_members" },
  { id: "client-access", title: "Client Access", subtitle: "Review shared resources and client access", href: "/resource-access", category: "Settings", icon: ShieldCheck, aliases: ["client access", "resource access"], roles: ["owner", "admin"] },
  { id: "workspace-access", title: "Workspace Access", subtitle: "Manage workspace membership and access", href: "/workspace-access", category: "Settings", icon: ShieldCheck, aliases: ["workspace access", "members", "member"], roles: ["owner", "admin"] },
  { id: "customization", title: "Workspace Customization", subtitle: "Manage custom fields and workspace configuration", href: "/settings/workspace/customization", category: "Settings", icon: Settings, aliases: ["custom field", "custom fields", "customization"], roles: ["owner", "admin", "manager"] },
  { id: "trash", title: "Trash", subtitle: "Restore or permanently remove deleted items", href: "/trash", category: "Navigation", icon: Trash2, aliases: ["deleted", "recycle bin"], roles: ["owner", "admin"] },
  { id: "shared-with-me", title: "Shared with Me", subtitle: "Open resources shared with your account", href: "/shared-with-me", category: "Navigation", icon: FolderOpen, aliases: ["shared"] },
  { id: "project-health", title: "Project Health", subtitle: "Review project progress and risks", href: "/project-health", category: "Navigation", icon: Activity, aliases: ["project health", "health"], roles: ["owner", "admin", "manager"] },
];

const rank = (value: string, query: string) => {
  const text = value.trim().toLocaleLowerCase();
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return 99;
  if (text === needle) return 0;
  if (text.startsWith(needle)) return 1;
  if (text.split(/\s+/).some((word) => word.startsWith(needle))) return 2;
  return text.includes(needle) ? 3 : 99;
};

export function getSearchNavigation(query: string, role: string | null, canPerform: (permission: string) => boolean): Record<string, SearchNavigationResult[]> {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2) return {};
  const matched = entries
    .filter((entry) => (!entry.roles || entry.roles.includes(String(role))) && (!entry.permission || canPerform(entry.permission)))
    .map((entry) => ({ entry, score: Math.min(rank(entry.title, needle), ...entry.aliases.map((alias) => rank(alias, needle))) }))
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title));
  return matched.reduce<Record<string, SearchNavigationResult[]>>((groups, { entry }) => {
    const { aliases: _aliases, roles: _roles, permission: _permission, ...result } = entry;
    (groups[entry.category] ||= []).push(result);
    return groups;
  }, {});
}
