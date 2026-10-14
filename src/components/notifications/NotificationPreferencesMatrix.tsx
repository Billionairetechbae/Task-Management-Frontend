import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { api, NotificationPreference } from "@/lib/api";

const LABELS: Record<NotificationPreference["category"], string> = {
  assignments: "Assignments",
  mentions_replies: "Mentions & replies",
  status_review: "Status & review changes",
  due_work: "Due soon & overdue",
  project_team: "Project & team updates",
  client_access: "Client access updates",
  workspace_commercial: "Workspace & commercial",
};

export function NotificationPreferencesMatrix() {
  const [rows, setRows] = useState<NotificationPreference[]>([]);
  const [linked, setLinked] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.getNotificationPreferences().then((result) => { setRows(result.data.preferences); setLinked(result.data.whatsApp.linked); setGlobalEnabled(result.data.whatsApp.globallyEnabled); }).catch(() => toast.error("Couldn't load notification preferences")).finally(() => setLoading(false)); }, []);
  const change = (category: NotificationPreference["category"], key: "inAppEnabled" | "emailEnabled" | "whatsAppEnabled", value: boolean) => setRows((current) => current.map((row) => row.category === category ? { ...row, [key]: value } : row));
  const save = async () => { setSaving(true); try { const result = await api.updateNotificationPreferences(rows); setRows(result.data.preferences); toast.success("Notification preferences saved"); } catch (error: any) { toast.error("Couldn't save notification preferences", { description: error?.message }); } finally { setSaving(false); } };
  if (loading) return <p className="text-sm text-muted-foreground">Loading notification preferences…</p>;
  return <section className="space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_64px_64px_88px] gap-2 items-center text-xs font-medium text-muted-foreground border-b pb-2"><span>Category</span><span>In-app</span><span>Email</span><span>WhatsApp</span></div>{rows.map((row) => <div key={row.category} className="grid grid-cols-[minmax(0,1fr)_64px_64px_88px] gap-2 items-center py-2 border-b last:border-0"><span className="text-sm">{LABELS[row.category]}</span><Switch aria-label={`${LABELS[row.category]} in-app`} checked={row.inAppEnabled} onCheckedChange={(value) => change(row.category, "inAppEnabled", value)} /><Switch aria-label={`${LABELS[row.category]} email`} checked={row.emailEnabled} onCheckedChange={(value) => change(row.category, "emailEnabled", value)} /><Switch aria-label={`${LABELS[row.category]} WhatsApp`} checked={row.whatsAppEnabled} disabled={!linked || !globalEnabled} onCheckedChange={(value) => change(row.category, "whatsAppEnabled", value)} /></div>)}<p className="text-xs text-muted-foreground">{!linked ? "Connect WhatsApp to enable this channel." : !globalEnabled ? "WhatsApp notifications are disabled in your WhatsApp settings." : "WhatsApp also respects your connected-account settings and quiet hours."}</p><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save notification preferences"}</Button></section>;
}
