import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { api, NotificationPreference } from "@/lib/api";
import { Link } from "react-router-dom";

const LABELS: Record<NotificationPreference["category"], string> = {
  assignments: "Assignments",
  mentions_replies: "Mentions & replies",
  status_review: "Status & review changes",
  due_work: "Due soon & overdue",
  project_team: "Project & team updates",
  client_access: "Client access updates",
  workspace_commercial: "Workspace & commercial",
};

type ChannelKey = "inAppEnabled" | "emailEnabled" | "whatsAppEnabled";

/** Plain-language email explanation for categories with mixed event defaults (currently Workspace & commercial). */
export function commercialEmailExplanation(row: NotificationPreference, touched: boolean | undefined): string | null {
  if (!row.eventDefaults?.some((d) => d.channel === "emailEnabled")) return null;
  const chosen = touched || row.explicit?.emailEnabled;
  if (!chosen) return "Email is on by default for join-request alerts and their outcomes. Other workspace emails (such as invitations, leaving or deleting a workspace) are off until you turn email on here.";
  return row.emailEnabled
    ? "You turned email on: all workspace & commercial notifications, including join requests, are emailed."
    : "You turned email off: no workspace & commercial emails are sent, including join-request alerts.";
}

export function NotificationPreferencesMatrix() {
  const [rows, setRows] = useState<NotificationPreference[]>([]);
  const [linked, setLinked] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Only channels the user actually toggled are sent, so untouched channels/categories keep their defaults.
  const [dirty, setDirty] = useState<Record<string, Partial<Record<ChannelKey, boolean>>>>({});
  useEffect(() => { api.getNotificationPreferences().then((result) => { setRows(result.data.preferences); setLinked(result.data.whatsApp.linked); setGlobalEnabled(result.data.whatsApp.globallyEnabled); }).catch(() => toast.error("Couldn't load notification preferences")).finally(() => setLoading(false)); }, []);
  const change = (category: NotificationPreference["category"], key: ChannelKey, value: boolean) => { setDirty((current) => ({ ...current, [category]: { ...current[category], [key]: value } })); setRows((current) => current.map((row) => row.category === category ? { ...row, [key]: value } : row)); };
  const save = async () => { setSaving(true); try { const patch = Object.entries(dirty).map(([category, channels]) => ({ category: category as NotificationPreference["category"], ...channels }));
      if (!patch.length) { toast.success("Notification preferences saved"); return; }
      const result = await api.updateNotificationPreferences(patch); setRows(result.data.preferences); setDirty({}); toast.success("Notification preferences saved"); } catch (error: any) { toast.error("Couldn't save notification preferences", { description: error?.message }); } finally { setSaving(false); } };
  if (loading) return <p className="text-sm text-muted-foreground">Loading notification preferences…</p>;
  const whatsappSelected = globalEnabled && rows.some((row) => row.whatsAppEnabled);
  return <section className="space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_64px_64px_88px] gap-2 items-center text-xs font-medium text-muted-foreground border-b pb-2"><span>Category</span><span>In-app</span><span>Email</span><span>WhatsApp</span></div>{rows.map((row) => { const note = commercialEmailExplanation(row, dirty[row.category]?.emailEnabled !== undefined); const noteId = `pref-note-${row.category}`; return <div key={row.category} className="border-b last:border-0 py-2"><div className="grid grid-cols-[minmax(0,1fr)_64px_64px_88px] gap-2 items-center"><span className="text-sm">{LABELS[row.category]}</span><Switch aria-label={`${LABELS[row.category]} in-app`} checked={row.inAppEnabled} onCheckedChange={(value) => change(row.category, "inAppEnabled", value)} /><Switch aria-label={`${LABELS[row.category]} email`} aria-describedby={note ? noteId : undefined} checked={row.emailEnabled} onCheckedChange={(value) => change(row.category, "emailEnabled", value)} /><Switch aria-label={`${LABELS[row.category]} WhatsApp`} checked={row.whatsAppEnabled} disabled={!linked || !globalEnabled} onCheckedChange={(value) => change(row.category, "whatsAppEnabled", value)} /></div>{note && <p id={noteId} className="mt-1.5 text-xs leading-relaxed text-muted-foreground break-words">{note}</p>}</div>; })}<p className="text-xs text-muted-foreground">{!linked ? <>{whatsappSelected ? "WhatsApp notifications are enabled in your preferences, but your WhatsApp account is not linked." : "Your WhatsApp account is not linked. Link it to enable this channel."} <Link className="font-medium text-primary underline underline-offset-4" to="/settings/integrations">Open WhatsApp setup</Link>.</> : !globalEnabled ? "WhatsApp notifications are disabled in your WhatsApp settings." : "WhatsApp also respects your connected-account settings and quiet hours."}</p><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save notification preferences"}</Button></section>;
}
