import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { api, type NotificationDeliveryMetrics, type NotificationDeliverySummary } from "@/lib/api";

export const canManageWorkspaceNotificationDeliveries = (role?: string | null) => role === "owner" || role === "admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EMPTY: NotificationDeliveryMetrics = { freshQueued: 0, staleQueued: 0, retrying: 0, failed: 0, sentRecently: 0 };

export function WorkspaceNotificationDelivery({ companyId }: { companyId: string | null }) {
  const [metrics, setMetrics] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<NotificationDeliverySummary | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setMetrics((await api.getWorkspaceNotificationDeliveryStatus()).data); }
    catch { setError("Delivery status could not be loaded. Check workspace access and try again."); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const process = async () => {
    setProcessing(true);
    setError("");
    setSummary(null);
    try {
      const response = await api.processWorkspaceNotificationDeliveries();
      setSummary(response.data.summary);
      await refresh();
    } catch {
      setError("The delivery queue could not be processed. Please wait a moment before trying again.");
    } finally { setProcessing(false); setConfirmOpen(false); }
  };

  const values = [
    ["Fresh queued", metrics.freshQueued],
    ["Retrying", metrics.retrying],
    ["Stale queued", metrics.staleQueued],
    ["Failed", metrics.failed],
    ["Sent recently", metrics.sentRecently],
  ] as const;

  return <Card className="rounded-2xl border-border/70 shadow-sm" aria-label="Notification delivery queue">
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Delivery queue</CardTitle>
      <CardDescription>In-app notifications appear immediately. Important Email and WhatsApp notifications are also attempted immediately; other external notifications may wait until an administrator processes the queue.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {values.map(([label, value]) => <div key={label} className="rounded-lg border bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-lg font-semibold" aria-label={`${label}: ${value}`}>{loading ? "—" : value}</div>
        </div>)}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {summary && <div role="status" className="rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Queue processing complete</p>
        <p className="mt-1 text-muted-foreground">Sent {summary.sent} · Failed {summary.failed} · Retrying {summary.retrying} · Expired {summary.expired}</p>
      </div>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || processing}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={loading || processing || metrics.freshQueued + metrics.retrying === 0}>
          {processing && <Loader2 className="h-4 w-4 animate-spin" />} Process queued notifications
        </Button>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !processing && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process queued notifications?</AlertDialogTitle>
            <AlertDialogDescription>Fresh Email and WhatsApp notifications for this workspace will be attempted. Notifications outside the delivery window will expire instead of being sent.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={processing} onClick={(event) => { event.preventDefault(); void process(); }}>
              {processing ? "Processing…" : "Process queue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardContent>
  </Card>;
}
