import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, CheckCircle2, Loader2, Plug, RefreshCw, Search, Settings2, X,
} from "lucide-react";
import useGoogleIntegrationStatus from "@/hooks/use-google-integration";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { api } from "@/lib/api";
import {
  Integration, IntegrationActivityEvent, STATUS_STYLES,
  extractActivity, extractIntegrations,
} from "@/lib/integrations";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";

const Integrations = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activity, setActivity] = useState<IntegrationActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Integration | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<Integration | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  // Ensure Google integration status is fetched and cached when this page loads
  useGoogleIntegrationStatus();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.listIntegrations();
      setIntegrations(extractIntegrations(res));
    } catch (err: any) {
      toast.error("Couldn't load integrations", { description: err?.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await api.getIntegrationActivity();
      setActivity(extractActivity(res));
    } catch {
      setActivity([]); // activity endpoint is optional
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadActivity(); }, [load, loadActivity]);

  // Show a toast + refresh when returning from OAuth (?connected=provider)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connected = params.get("connected");
    const failed = params.get("error");
    if (connected) {
      toast.success(`${connected[0].toUpperCase()}${connected.slice(1)} connected successfully.`);
      load(true);
      params.delete("connected");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    } else if (failed) {
      toast.error("Integration connection failed", { description: failed });
      params.delete("error");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [location.search, location.pathname, navigate, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return integrations;
    return integrations.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
    );
  }, [integrations, search]);

  const connected = filtered.filter((i) => i.connected);
  const available = filtered.filter((i) => !i.connected);

  const summary = useMemo(() => {
    const connectedCount = integrations.filter((i) => i.connected).length;
    const availableCount = integrations.filter((i) => i.available && !i.connected).length;
    const automation = integrations.find(
      (i) => i.connected && i.capabilities.some((c) => c.enabled)
    );
    const lastSync = integrations
      .map((i) => i.lastSyncAt)
      .filter(Boolean)
      .sort()
      .pop();
    return { connectedCount, availableCount, automation, lastSync };
  }, [integrations]);

  const handleConnect = (integration: Integration) => {
    if (!integration.available) return;
    sessionStorage.setItem("integration_return", "/settings/integrations");
    // Prefer backend-provided authUrl when available; fall back to a direct redirect.
    setBusyProvider(integration.id);
    api
      .getIntegrationConnectUrl(integration.id)
      .then((res) => {
        const authUrl = res?.data?.authUrl ?? res?.authUrl ?? res?.url;
        window.location.href = authUrl || api.buildIntegrationConnectUrl(integration.id);
      })
      .catch(() => {
        window.location.href = api.buildIntegrationConnectUrl(integration.id);
      });
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    const provider = disconnectTarget.id;
    setBusyProvider(provider);
    try {
      await api.disconnectIntegration(provider);
      toast.success(`${disconnectTarget.name} disconnected`);
      setDisconnectTarget(null);
      setSelected(null);
      await load(true);
    } catch (err: any) {
      toast.error("Disconnect failed", { description: err?.message });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
            <p className="text-muted-foreground mt-1.5 max-w-2xl">
              Connect your favorite tools to automate your work across Admiino.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search integrations..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => load(true)} disabled={refreshing} title="Refresh">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Connected" value={loading ? "—" : String(summary.connectedCount)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
          <SummaryCard label="Available" value={loading ? "—" : String(summary.availableCount)} icon={<Plug className="w-4 h-4 text-primary" />} />
          <SummaryCard
            label="Automation Ready"
            value={summary.automation ? summary.automation.name : "—"}
            hint={summary.automation ? "Enabled" : "Connect a service"}
            icon={<Settings2 className="w-4 h-4 text-blue-500" />}
          />
          <SummaryCard
            label="Last Sync"
            value={summary.lastSync ? formatDistanceToNow(new Date(summary.lastSync), { addSuffix: true }) : "—"}
            icon={<Activity className="w-4 h-4 text-orange-500" />}
          />
        </div>

        {/* Empty state */}
        {!loading && integrations.length === 0 && (
          <Card className="p-10 text-center border-dashed">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Plug className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect your first integration</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Integrate your productivity tools to unlock calendar syncing, meeting scheduling,
              document management and workflow automation.
            </p>
            <Button onClick={() => handleConnect({ id: "google", name: "Google", available: true } as Integration)}>
              Connect Google
            </Button>
          </Card>
        )}

        {/* Connected */}
        {loading ? (
          <SectionSkeleton title="Connected" />
        ) : connected.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Connected
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {connected.map((i) => (
                <IntegrationCard
                  key={i.id}
                  integration={i}
                  busy={busyProvider === i.id}
                  onManage={() => setSelected(i)}
                  onDisconnect={() => setDisconnectTarget(i)}
                  onConnect={() => handleConnect(i)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Available */}
        {loading ? (
          <SectionSkeleton title="Available" count={6} />
        ) : available.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Available
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {available.map((i) => (
                <IntegrationCard
                  key={i.id}
                  integration={i}
                  busy={busyProvider === i.id}
                  onManage={() => setSelected(i)}
                  onDisconnect={() => setDisconnectTarget(i)}
                  onConnect={() => handleConnect(i)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Activity */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Activity
          </h2>
          <Card className="p-4">
            {activityLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((k) => <Skeleton key={k} className="h-10 w-full" />)}
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No integration events yet.
              </p>
            ) : (
              <ol className="relative border-l border-border ml-2">
                {activity.map((ev) => (
                  <li key={ev.id} className="pl-4 pb-4 last:pb-0 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{ev.message}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {ev.provider && (
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{ev.provider}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </section>
      </div>

      {/* Manage drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <IntegrationLogo integration={selected} size={48} />
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl">{selected.name}</SheetTitle>
                    <SheetDescription className="truncate">
                      {selected.accountEmail || selected.description}
                    </SheetDescription>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[selected.status].className}>
                    {STATUS_STYLES[selected.status].label}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <DetailRow label="Connected account" value={selected.accountEmail || "—"} />
                <DetailRow
                  label="Connection date"
                  value={selected.connectedAt ? new Date(selected.connectedAt).toLocaleString() : "—"}
                />
                <DetailRow
                  label="Last sync"
                  value={selected.lastSyncAt ? formatDistanceToNow(new Date(selected.lastSyncAt), { addSuffix: true }) : "—"}
                />

                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Scopes granted
                  </p>
                  {selected.capabilities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No scopes reported.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selected.capabilities.map((c) => (
                        <li key={c.name} className="flex items-center justify-between text-sm">
                          <span>{c.name}</span>
                          <span className={c.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                            {c.enabled ? "✓ Enabled" : "Not enabled"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {selected.connected ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleConnect(selected)}
                        disabled={busyProvider === selected.id}
                      >
                        {busyProvider === selected.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Reconnect
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setDisconnectTarget(selected)}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : selected.available ? (
                    <Button className="flex-1" onClick={() => handleConnect(selected)}>
                      Connect {selected.name}
                    </Button>
                  ) : (
                    <Button className="flex-1" disabled>Coming soon</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Disconnect confirmation */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={(o) => !o && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Disconnecting {disconnectTarget?.name} will stop calendar syncing, meeting creation
              and Drive access. Existing Admiino data will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busyProvider === disconnectTarget?.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

/* ---------- small building blocks ---------- */

const SummaryCard = ({
  label, value, hint, icon,
}: { label: string; value: string; hint?: string; icon: React.ReactNode }) => (
  <Card className="p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      {icon}
    </div>
    <p className="text-2xl font-bold mt-2 truncate">{value}</p>
    {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
  </Card>
);

const SectionSkeleton = ({ title, count = 3 }: { title: string; count?: number }) => (
  <section>
    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  </section>
);

const IntegrationCard = ({
  integration, busy, onManage, onDisconnect, onConnect,
}: {
  integration: Integration;
  busy: boolean;
  onManage: () => void;
  onDisconnect: () => void;
  onConnect: () => void;
}) => {
  const style = STATUS_STYLES[integration.status];
  return (
    <Card className="p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start gap-3">
        <IntegrationLogo integration={integration} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{integration.name}</h3>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style.className}`}>
              {style.label}
            </Badge>
          </div>
          {integration.id === "google" ? (
            <div className="mt-0.5">
              {integration.connected ? (
                <p className="text-sm font-medium">✓ Connected</p>
              ) : (
                <p className="text-sm font-medium">Not Connected</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {integration.connected ? "Calendar Sync Enabled" : "Connect Google Calendar"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {integration.description || `Integrate ${integration.name} with your workspace.`}
            </p>
          )}
        </div>
      </div>

      {integration.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {integration.capabilities.slice(0, 6).map((c) => (
            <Badge
              key={c.name}
              variant="secondary"
              className={`text-[10px] font-normal ${c.enabled ? "" : "opacity-60"}`}
            >
              {c.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        {integration.connected ? (
          <>
            <Button size="sm" variant="outline" className="flex-1" onClick={onManage}>Manage</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDisconnect}>
              Disconnect
            </Button>
          </>
        ) : integration.available ? (
          <Button size="sm" className="flex-1" onClick={onConnect} disabled={busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : null}
            Connect
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="flex-1" disabled>Coming soon</Button>
        )}
      </div>
    </Card>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <p className="text-sm">{value}</p>
  </div>
);

export default Integrations;
