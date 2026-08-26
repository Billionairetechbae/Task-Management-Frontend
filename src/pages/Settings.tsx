import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ChevronRight,
  Copy,
  FileArchive,
  Info,
  KeyRound,
  Laptop,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Plug,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders,
  Sun,
  User as UserIcon,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import useTheme, { ThemeMode } from "@/hooks/use-theme";
import useLocalPreferences from "@/hooks/use-local-preferences";
import Profile from "./Profile";
import Integrations from "./Integrations";
import AuditExport from "./AuditExport";

type TabId =
  | "profile"
  | "account"
  | "appearance"
  | "notifications"
  | "preferences"
  | "integrations"
  | "audit"
  | "about";

const TABS: {
  id: TabId;
  label: string;
  description: string;
  icon: typeof UserIcon;
}[] = [
  { id: "profile", label: "Profile", description: "Your professional profile & CV", icon: UserIcon },
  { id: "account", label: "Account", description: "Identity, workspace & session", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", description: "Theme, density & motion", icon: Palette },
  { id: "notifications", label: "Notifications", description: "Alerts on this device", icon: Bell },
  { id: "preferences", label: "Preferences", description: "Navigation & behaviour", icon: Sliders },
  { id: "integrations", label: "Integrations", description: "Connected apps & services", icon: Plug },
  { id: "audit",        label: "Audit & Exports", description: "Workspace data exports",    icon: FileArchive },
  { id: "about",        label: "About",        description: "App info & support",          icon: Info },
];

/* ------------------------------------------------------------------ */
/* small building blocks                                               */
/* ------------------------------------------------------------------ */

const SectionCard = ({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <Card className="rounded-2xl border-border/70 shadow-sm">
    <CardHeader className="pb-4">
      <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
      {description && <CardDescription className="text-[13px]">{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-1 pb-5">{children}</CardContent>
    {footer && <div className="px-6 pb-5">{footer}</div>}
  </Card>
);

const ToggleRow = ({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground text-right break-all">{value}</span>
  </div>
);

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun; hint: string }[] = [
  { id: "light", label: "Light", icon: Sun, hint: "Bright & crisp" },
  { id: "dark", label: "Dark", icon: Moon, hint: "Easy on the eyes" },
  { id: "system", label: "System", icon: Laptop, hint: "Follow device" },
];

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

const Settings = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, logout, workspaceRole, activeCompanyId } = useAuth();
  const { theme, setTheme, resolved } = useTheme();
  const { prefs, update, reset } = useLocalPreferences();

  const initial = (params.get("tab") as TabId) || "profile";
  const [active, setActive] = useState<TabId>(
    TABS.some((t) => t.id === initial) ? initial : "profile"
  );

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("tab", active);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const workspaceName = useMemo(
    () => localStorage.getItem("activeWorkspaceName") || "—",
    []
  );

  const requestDesktopPermission = async (enabled: boolean) => {
    if (!enabled) {
      update("desktopNotifications", false);
      return;
    }
    if (typeof Notification === "undefined") {
      toast.error("This browser does not support desktop notifications");
      return;
    }
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission === "granted") {
      update("desktopNotifications", true);
      toast.success("Desktop notifications enabled on this device");
    } else {
      update("desktopNotifications", false);
      toast.error("Permission denied", {
        description: "Allow notifications in your browser settings to enable this.",
      });
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const activeTab = TABS.find((t) => t.id === active)!;

  const renderContent = () => {
    switch (active) {
      case "profile":
        return <Profile embedded />;

      case "integrations":
        return <Integrations embedded />;

      case "audit":
        return <AuditExport embedded />;

      case "account":
        return (
          <div className="space-y-5">
            <SectionCard title="Identity" description="Details from your Admiino account.">
              <InfoRow
                label="Full name"
                value={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "—"}
              />
              <InfoRow label="Email" value={user?.email || "—"} />
              <InfoRow
                label="Account role"
                value={<Badge variant="secondary" className="capitalize">{user?.role?.replace("_", " ") || "—"}</Badge>}
              />
              <InfoRow
                label="User ID"
                value={
                  <button
                    onClick={() => user?.id && copy(user.id, "User ID")}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary"
                  >
                    {user?.id ? `${user.id.slice(0, 12)}…` : "—"}
                    <Copy className="h-3 w-3" />
                  </button>
                }
              />
            </SectionCard>

            <SectionCard title="Active workspace" description="The workspace all data is scoped to.">
              <InfoRow label="Workspace" value={workspaceName} />
              <InfoRow
                label="Workspace role"
                value={<Badge className="capitalize">{workspaceRole || "member"}</Badge>}
              />
              <InfoRow
                label="Workspace ID"
                value={
                  <button
                    onClick={() => activeCompanyId && copy(activeCompanyId, "Workspace ID")}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary"
                  >
                    {activeCompanyId ? `${activeCompanyId.slice(0, 12)}…` : "—"}
                    <Copy className="h-3 w-3" />
                  </button>
                }
              />
            </SectionCard>

            <SectionCard
              title="Security & session"
              description="Manage how you access Admiino on this device."
            >
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => navigate("/forgot-password")}
                  className="justify-start"
                >
                  <KeyRound className="h-4 w-4 mr-2" /> Reset password
                </Button>
                <Button variant="destructive" onClick={logout} className="justify-start">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </Button>
              </div>
            </SectionCard>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-5">
            <SectionCard
              title="Theme"
              description={`Currently using the ${resolved} theme. Saved on this device.`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {THEME_OPTIONS.map((opt) => {
                  const selected = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setTheme(opt.id)}
                      className={cn(
                        "group relative text-left rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/25"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <opt.icon
                          className={cn(
                            "h-5 w-5",
                            selected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        {selected && (
                          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.hint}</p>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Display" description="Fine-tune the interface feel.">
              <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60">
                <div>
                  <p className="text-sm font-medium">Interface density</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Compact fits more rows on screen.
                  </p>
                </div>
                <Select
                  value={prefs.density}
                  onValueChange={(v) => update("density", v as typeof prefs.density)}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ToggleRow
                label="Reduce motion"
                hint="Minimise animations and transitions."
                checked={prefs.reduceMotion}
                onChange={(v) => update("reduceMotion", v)}
              />
            </SectionCard>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-5">
            <SectionCard
              title="Device notifications"
              description="These preferences apply to this browser only."
            >
              <ToggleRow
                label="Desktop notifications"
                hint="Show a system notification for new activity."
                checked={prefs.desktopNotifications}
                onChange={requestDesktopPermission}
              />
              <ToggleRow
                label="Notification sound"
                hint="Play a subtle chime for new alerts."
                checked={prefs.notificationSound}
                onChange={(v) => update("notificationSound", v)}
              />
              <ToggleRow
                label="Mentions & assignments only"
                hint="Mute everything except items that involve you directly."
                checked={prefs.mentionsOnly}
                onChange={(v) => update("mentionsOnly", v)}
              />
              <ToggleRow
                label="Show unread badge"
                hint="Display the unread counter on the bell icon."
                checked={prefs.showUnreadBadge}
                onChange={(v) => update("showUnreadBadge", v)}
              />
            </SectionCard>

            <SectionCard title="Inbox" description="Jump to your full notification history.">
              <Button variant="outline" onClick={() => navigate("/notifications")} className="mt-1">
                <Bell className="h-4 w-4 mr-2" /> Open notifications
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </SectionCard>
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-5">
            <SectionCard title="Navigation" description="Where Admiino takes you and how.">
              <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60">
                <div>
                  <p className="text-sm font-medium">Default landing page</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Opened right after you sign in.
                  </p>
                </div>
                <Select
                  value={prefs.defaultLandingPage}
                  onValueChange={(v) => update("defaultLandingPage", v)}
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/dashboard">Dashboard</SelectItem>
                    <SelectItem value="/tasks/all">All tasks</SelectItem>
                    <SelectItem value="/tasks/workbench">Task workbench</SelectItem>
                    <SelectItem value="/projects">Projects</SelectItem>
                    <SelectItem value="/calendar">Calendar</SelectItem>
                    <SelectItem value="/drive">Drive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ToggleRow
                label="Start with sidebar collapsed"
                hint="Give content more room by default."
                checked={prefs.sidebarCollapsedByDefault}
                onChange={(v) => update("sidebarCollapsedByDefault", v)}
              />
            </SectionCard>

            <SectionCard title="Behaviour" description="Guard-rails and list sizing.">
              <ToggleRow
                label="Confirm before deleting"
                hint="Ask for confirmation on destructive actions."
                checked={prefs.confirmBeforeDelete}
                onChange={(v) => update("confirmBeforeDelete", v)}
              />
              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">Rows per list</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Items shown before pagination kicks in.
                  </p>
                </div>
                <Select
                  value={String(prefs.tablePageSize)}
                  onValueChange={(v) => update("tablePageSize", Number(v))}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 10, 15, 25].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </SectionCard>

            <SectionCard
              title="Reset"
              description="Restore all device preferences to their defaults."
            >
              <Button
                variant="outline"
                className="mt-1"
                onClick={() => {
                  reset();
                  toast.success("Preferences reset");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Reset to defaults
              </Button>
            </SectionCard>
          </div>
        );

      case "about":
        return (
          <div className="space-y-5">
            <SectionCard title="Admiino" description="Workspace operations, harmonised.">
              <InfoRow label="Environment" value={import.meta.env.MODE} />
              <InfoRow label="Theme" value={<span className="capitalize">{resolved}</span>} />
              <InfoRow label="Signed in as" value={user?.email || "—"} />
            </SectionCard>

            <SectionCard title="Shortcuts" description="Handy keys inside the task workbench.">
              {[
                ["/ or ⌘K", "Focus task search"],
                ["1 – 4", "Switch collaboration tabs"],
                ["Esc", "Close panels & modals"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-0"
                >
                  <kbd className="px-2 py-1 rounded-md bg-muted text-xs font-mono">{k}</kbd>
                  <span className="text-sm text-muted-foreground">{v}</span>
                </div>
              ))}
            </SectionCard>
          </div>
        );
    }
  };

  return (
    <DashboardLayout fullWidth>
      <div className="space-y-6 animate-fade-in">
        {/* Page header */}
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your profile, workspace access, appearance and connected apps.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Side tab list — 15–25% on desktop */}
          <aside className="w-full lg:w-[22%] lg:min-w-[220px] lg:max-w-[300px] shrink-0">
            {/* mobile: horizontal scroller */}
            <div className="lg:hidden -mx-1 px-1 overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActive(t.id)}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all",
                      active === t.id
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* desktop: vertical list */}
            <Card className="hidden lg:block rounded-2xl border-border/70 shadow-sm overflow-hidden lg:sticky lg:top-20">
              <ScrollArea className="max-h-[70vh]">
                <nav className="p-2 space-y-1">
                  {TABS.map((t) => {
                    const selected = active === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActive(t.id)}
                        className={cn(
                          "group w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                          selected
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          <t.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold truncate">
                            {t.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {t.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>
              <Separator />
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </Button>
              </div>
            </Card>
          </aside>

          {/* Content pane */}
          <section className="flex-1 min-w-0">
            <div className="hidden lg:flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <SettingsIcon className="h-3.5 w-3.5" />
              Settings
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{activeTab.label}</span>
            </div>
            <div key={active} className="animate-fade-in">
              {renderContent()}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
