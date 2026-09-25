import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";

const keys = [
  ["whatsappEnabled", "Enable WhatsApp notifications"], ["assignments", "Assignments"],
  ["deadlinesReminders", "Deadlines and reminders"], ["overdue", "Overdue work"],
  ["mentions", "Task mentions"], ["reviewWorkflow", "Review workflow"],
  ["teamDiscussionMentions", "Team discussion mentions"], ["completionStatus", "Completion and status changes"],
] as const;
type Preferences = Record<(typeof keys)[number][0], boolean>;
type QuietHours = { enabled: boolean; startTime: string | null; endTime: string | null; timeZone: string | null };
const empty: Preferences = Object.fromEntries(keys.map(([key]) => [key, true])) as Preferences;

export function WhatsAppSettings() {
  const [preferences, setPreferences] = useState<Preferences>(empty);
  const [quiet, setQuiet] = useState<QuietHours>({ enabled: false, startTime: "22:00", endTime: "07:00", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([api.getWhatsAppPreferences(), api.getWhatsAppQuietHours()]).then(([p, q]: any[]) => {
    setPreferences({ ...empty, ...(p?.data || {}) }); setQuiet((old) => ({ ...old, ...(q?.data || {}) }));
  }).catch((e) => toast.error("Couldn't load WhatsApp settings", { description: e?.message })).finally(() => setLoading(false)); }, []);
  const save = async () => { setSaving(true); try { await Promise.all([api.updateWhatsAppPreferences(preferences), api.updateWhatsAppQuietHours(quiet)]); toast.success("WhatsApp settings saved"); } catch (e: any) { toast.error("Couldn't save WhatsApp settings", { description: e?.message }); } finally { setSaving(false); } };
  if (loading) return <p className="text-sm text-muted-foreground">Loading notification settings…</p>;
  return <section className="space-y-5 border-t pt-5"><div><h3 className="font-medium">WhatsApp notifications</h3><p className="text-sm text-muted-foreground">Choose which business updates Admiino may send.</p></div>
    <div className="space-y-3">{keys.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><Switch checked={preferences[key]} onCheckedChange={(value) => setPreferences((p) => ({ ...p, [key]: value }))} /></label>)}</div>
    <div className="space-y-3 border-t pt-4"><label className="flex items-center justify-between text-sm"><span>Quiet hours</span><Switch checked={quiet.enabled} onCheckedChange={(enabled) => setQuiet((q) => ({ ...q, enabled }))} /></label>
      {quiet.enabled && <div className="grid grid-cols-3 gap-2"><Input aria-label="Quiet hours start" type="time" value={quiet.startTime || ""} onChange={(e) => setQuiet((q) => ({ ...q, startTime: e.target.value }))}/><Input aria-label="Quiet hours end" type="time" value={quiet.endTime || ""} onChange={(e) => setQuiet((q) => ({ ...q, endTime: e.target.value }))}/><Input aria-label="Quiet hours timezone" value={quiet.timeZone || ""} onChange={(e) => setQuiet((q) => ({ ...q, timeZone: e.target.value }))}/></div>}
    </div><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save WhatsApp settings"}</Button></section>;
}
