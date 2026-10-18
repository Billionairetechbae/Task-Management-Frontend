import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Shield, ShieldAlert } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceGovernance } from "@/hooks/useWorkspaceGovernance";
import { api, GovernancePolicy, WorkspaceGovernanceSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Change = { key: keyof WorkspaceGovernanceSettings; value: GovernancePolicy | boolean; title: string; description: string; restricts: boolean };
const POLICY_OPTIONS: Array<[GovernancePolicy, string]> = [["owners_admins", "Owners & admins only"], ["existing_permissions", "Follow existing permissions"]];
const labels: Record<string, string> = { memberInvitePolicy: "Member invites", projectCreationPolicy: "Project creation", teamManagementPolicy: "Team management", clientInvitePolicy: "Client invites", integrationManagementPolicy: "Integration management" };

function PolicyControl({ label, value, onChange, disabled }: { label: string; value: GovernancePolicy; onChange: (value: GovernancePolicy) => void; disabled: boolean }) {
  return <label className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as GovernancePolicy)} className="h-10 w-full rounded-md border bg-background px-3 sm:max-w-xs"><option value="owners_admins">Owners &amp; admins only</option><option value="existing_permissions">Follow existing permissions</option></select></label>;
}

function FeatureControl({ label, value, description, onChange, disabled }: { label: string; value: boolean; description: string; onChange: (value: boolean) => void; disabled: boolean }) {
  return <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div><button type="button" role="switch" aria-checked={value} aria-label={label} disabled={disabled} onClick={() => onChange(!value)} className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${value ? "bg-primary" : "bg-muted-foreground/40"}`}><span className={`inline-block h-5 w-5 rounded-full bg-background shadow transition-transform ${value ? "translate-x-[22px]" : "translate-x-0.5"}`} /></button></div>;
}

export default function WorkspaceGovernance() {
  const { workspaceRole, activeCompanyId } = useAuth();
  const governance = useWorkspaceGovernance();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Change | null>(null);
  const save = useMutation({
    mutationFn: (change: Change) => api.updateWorkspaceGovernance({ [change.key]: change.value }),
    onSuccess: (result) => {
      queryClient.setQueryData(["workspace-governance", activeCompanyId], result);
      queryClient.invalidateQueries({ queryKey: ["workspace-governance", activeCompanyId] });
      setPending(null);
    },
  });
  const permitted = workspaceRole === "owner" || workspaceRole === "admin";
  const settings = governance.settings;

  const requestChange = (change: Change) => {
    if (change.restricts) setPending(change);
    else save.mutate(change);
  };
  const policyChange = (key: keyof WorkspaceGovernanceSettings, value: GovernancePolicy) => requestChange({ key, value, title: `Restrict ${labels[key]}?`, description: "This will add a governance restriction on top of existing workspace role permissions. It cannot grant permissions that a role does not already have.", restricts: value === "owners_admins" });
  const featureChange = (key: keyof WorkspaceGovernanceSettings, value: boolean, label: string, description: string) => requestChange({ key, value, title: `Disable ${label}?`, description, restricts: !value });

  if (!permitted) return <DashboardLayout><main className="mx-auto max-w-3xl p-6"><Card><CardContent className="flex items-start gap-3 p-6"><ShieldAlert className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><h1 className="font-semibold">Workspace Governance</h1><p className="mt-1 text-sm text-muted-foreground">Workspace owner or admin access is required to view or edit governance settings.</p></div></CardContent></Card></main></DashboardLayout>;

  const policy = (key: keyof WorkspaceGovernanceSettings, label: string) => <PolicyControl key={key} label={label} value={(settings?.[key] as GovernancePolicy) || "existing_permissions"} disabled={!settings || save.isPending} onChange={(value) => policyChange(key, value)} />;
  const feature = (key: keyof WorkspaceGovernanceSettings, label: string, detail: string) => <FeatureControl key={key} label={label} value={settings?.[key] === true} description={detail} disabled={!settings || save.isPending} onChange={(value) => featureChange(key, value, label, detail)} />;

  return <DashboardLayout><main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-7">
    <header className="flex items-start gap-3"><Shield className="mt-1 h-5 w-5 text-primary" /><div><h1 className="text-2xl font-semibold tracking-tight">Workspace Governance</h1><p className="mt-1 text-sm text-muted-foreground">Control who can manage sensitive workspace capabilities and which features are available.</p></div><span className="ml-auto hidden items-center gap-1 rounded-full border px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex"><CircleHelp className="h-3.5 w-3.5" />Owners &amp; admins</span></header>
    {settings && <section aria-label="Governance summary" className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 text-xs sm:grid-cols-3 lg:grid-cols-5"><Summary label="Members" value={settings.memberInvitePolicy === "owners_admins" ? "Restricted" : "Existing permissions"} /><Summary label="Projects" value={settings.projectCreationPolicy === "owners_admins" ? "Restricted" : "Existing permissions"} /><Summary label="Google Drive" value={settings.googleDriveEnabled ? "On" : "Off"} /><Summary label="Dropbox" value={settings.dropboxEnabled ? "On" : "Off"} /><Summary label="Automations · Time" value={`${settings.automationsEnabled ? "On" : "Off"} · ${settings.timeTrackingEnabled ? "On" : "Off"}`} /></section>}
    {governance.isLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading Workspace Governance…</CardContent></Card>}
    {governance.isError && <Card><CardContent className="p-6 text-sm text-destructive">Workspace Governance settings could not be loaded. Refresh the page or check workspace access.</CardContent></Card>}
    {save.isError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{(save.error as Error)?.message || "Governance settings could not be saved."}</p>}
    {settings && <>
      <Section title="Members & access" description="Control workspace invitations within the existing role authorization model.">{policy("memberInvitePolicy", "Who can invite members?")}<div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{governance.data?.data.teamLeadMemberManagement.message || "Team Leads cannot manage Team members under current role permissions."}</div></Section>
      <Section title="Projects & Teams" description="Governance can narrow existing permissions; it never grants a role a capability it does not already have.">{policy("projectCreationPolicy", "Who can create Projects?")}{policy("teamManagementPolicy", "Who can create or manage Teams?")}</Section>
      <Section title="Clients" description="Control who can create new client sharing links. Existing client access is not revoked.">{policy("clientInvitePolicy", "Who can invite clients or create share links?")}</Section>
      <Section title="Integrations" description="Disabling a provider blocks new connection and browse/attach operations. It does not delete provider files or stored Admiino references.">{policy("integrationManagementPolicy", "Who can manage integrations?")}{feature("googleDriveEnabled", "Google Drive", "Blocks new Drive authorization and use in this workspace. Google sign-in remains available; Drive files are not deleted.")}{feature("dropboxEnabled", "Dropbox Connected Storage", "Blocks new connections, browsing, and attachments. Stored references remain; Dropbox files are not deleted.")}</Section>
      <Section title="Automations" description="Rules and run history are preserved while this workspace feature is paused.">{feature("automationsEnabled", "Automations enabled", "When disabled, rules do not execute and cannot be created, edited, or enabled. Turning Automations back on resumes rules that remain enabled.")}</Section>
      <Section title="Time Tracking" description="Turning this off preserves entries and keeps report visibility governed by existing permissions.">{feature("timeTrackingEnabled", "Time Tracking enabled", "When disabled, users cannot start timers or log new time. An existing timer can still be stopped or cancelled; historical entries remain available.")}</Section>
    </>}
    <AlertDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open) setPending(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pending?.title}</AlertDialogTitle><AlertDialogDescription>{pending?.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={save.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={save.isPending} onClick={(event) => { event.preventDefault(); if (pending) save.mutate(pending); }}>{save.isPending ? "Saving…" : "Confirm change"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main></DashboardLayout>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle><p className="text-sm text-muted-foreground">{description}</p></CardHeader><CardContent className="space-y-4">{children}</CardContent></Card>;
}
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/40 px-3 py-2"><p className="text-muted-foreground">{label}</p><p className="mt-0.5 font-medium text-foreground">{value}</p></div>; }
