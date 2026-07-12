// Shared helpers/types for the Integration Hub.
// The backend is the source of truth — we only normalize its response
// and map provider IDs to a local logo/description fallback so we can
// render providers we haven't seen before without a code change.

export type IntegrationStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR"
  | "EXPIRED"
  | "SYNCING"
  | "COMING_SOON";

export interface IntegrationCapability {
  name: string;
  enabled?: boolean;
}

export interface Integration {
  id: string;                    // provider id used in URLs, e.g. "google"
  name: string;                  // display name
  description?: string;
  status: IntegrationStatus;
  connected: boolean;
  available: boolean;            // false => "Coming Soon"
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  accountEmail?: string | null;
  accountAvatarUrl?: string | null;
  capabilities: IntegrationCapability[];
  scopes?: string[];
  raw?: any;
}

export interface IntegrationActivityEvent {
  id: string;
  provider?: string;
  message: string;
  createdAt: string;
  type?: string;
}

// Fallback metadata for well-known providers so the UI is beautiful
// even before the backend enriches its response. NEVER used to hide
// or change providers the backend actually returned.
export const PROVIDER_META: Record<
  string,
  { name: string; description: string; brand: string; capabilities?: string[] }
> = {
  google: {
    name: "Google",
    description: "Calendar, Drive, Meet, Docs and Sheets in one place.",
    brand: "#4285F4",
    capabilities: ["Calendar", "Drive", "Meet", "Docs", "Sheets"],
  },
  microsoft: {
    name: "Microsoft 365",
    description: "Outlook, Teams, OneDrive and Excel connectivity.",
    brand: "#0078D4",
    capabilities: ["Outlook", "Teams", "OneDrive", "Excel"],
  },
  zoom: {
    name: "Zoom",
    description: "Create meetings and pull recordings automatically.",
    brand: "#2D8CFF",
    capabilities: ["Meetings", "Recordings"],
  },
  slack: {
    name: "Slack",
    description: "Deliver notifications and task updates to channels.",
    brand: "#4A154B",
    capabilities: ["Notifications", "Task updates"],
  },
  dropbox: {
    name: "Dropbox",
    description: "Attach and sync files from your Dropbox account.",
    brand: "#0061FF",
    capabilities: ["Files", "Sync"],
  },
  notion: {
    name: "Notion",
    description: "Link Notion pages and databases to tasks.",
    brand: "#000000",
    capabilities: ["Pages", "Databases"],
  },
  jira: {
    name: "Jira",
    description: "Sync issues and projects with Admiino tasks.",
    brand: "#2684FF",
    capabilities: ["Issues", "Projects"],
  },
  github: {
    name: "GitHub",
    description: "Reference repos, issues and pull requests inline.",
    brand: "#181717",
    capabilities: ["Repositories", "Issues"],
  },
  salesforce: {
    name: "Salesforce",
    description: "Bring CRM accounts and opportunities into workflows.",
    brand: "#00A1E0",
    capabilities: ["Accounts", "Opportunities"],
  },
  hubspot: {
    name: "HubSpot",
    description: "Sync contacts and deals with your workspace.",
    brand: "#FF7A59",
    capabilities: ["Contacts", "Deals"],
  },
};

function normStatus(raw: any, connected: boolean, available: boolean): IntegrationStatus {
  const s = String(raw ?? "").toUpperCase();
  if (["CONNECTED", "DISCONNECTED", "ERROR", "EXPIRED", "SYNCING", "COMING_SOON"].includes(s)) {
    return s as IntegrationStatus;
  }
  if (!available) return "COMING_SOON";
  return connected ? "CONNECTED" : "DISCONNECTED";
}

function normCapabilities(raw: any, fallback: string[] = []): IntegrationCapability[] {
  if (Array.isArray(raw)) {
    return raw.map((c: any) =>
      typeof c === "string"
        ? { name: c, enabled: true }
        : { name: c.name ?? c.label ?? String(c), enabled: c.enabled !== false }
    );
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([name, enabled]) => ({ name, enabled: !!enabled }));
  }
  return fallback.map((c) => ({ name: c, enabled: false }));
}

export function normalizeIntegration(input: any): Integration {
  const id = String(input.id ?? input.provider ?? input.key ?? "").toLowerCase();
  const meta = PROVIDER_META[id] ?? { name: id, description: "", brand: "#6366F1" };
  const connected = Boolean(
    input.connected ?? input.isConnected ?? (String(input.status ?? "").toUpperCase() === "CONNECTED")
  );
  const available = input.available !== undefined
    ? Boolean(input.available)
    : !(input.comingSoon || String(input.status ?? "").toUpperCase() === "COMING_SOON");

  return {
    id,
    name: input.name || meta.name,
    description: input.description || meta.description,
    status: normStatus(input.status, connected, available),
    connected,
    available,
    connectedAt: input.connectedAt ?? input.connected_at ?? null,
    lastSyncAt: input.lastSyncAt ?? input.last_sync_at ?? input.lastSync ?? null,
    accountEmail: input.accountEmail ?? input.email ?? input.account?.email ?? null,
    accountAvatarUrl: input.accountAvatarUrl ?? input.avatarUrl ?? input.account?.avatarUrl ?? null,
    capabilities: normCapabilities(input.capabilities ?? input.scopesGranted, meta.capabilities),
    scopes: input.scopes ?? input.scopesGranted ?? [],
    raw: input,
  };
}

export function extractIntegrations(payload: any): Integration[] {
  const list =
    payload?.data?.integrations ??
    payload?.integrations ??
    payload?.data ??
    payload ??
    [];
  if (!Array.isArray(list)) return [];
  return list.map(normalizeIntegration);
}

export function extractActivity(payload: any): IntegrationActivityEvent[] {
  const list =
    payload?.data?.activity ??
    payload?.data?.events ??
    payload?.activity ??
    payload?.events ??
    payload?.data ??
    payload ??
    [];
  if (!Array.isArray(list)) return [];
  return list.map((e: any, idx: number) => ({
    id: String(e.id ?? idx),
    provider: e.provider,
    message: e.message || e.description || e.event || "Integration event",
    createdAt: e.createdAt || e.created_at || e.timestamp || new Date().toISOString(),
    type: e.type,
  }));
}

export const STATUS_STYLES: Record<IntegrationStatus, { label: string; className: string }> = {
  CONNECTED:    { label: "Connected",    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  DISCONNECTED: { label: "Not connected", className: "bg-muted text-muted-foreground border-border" },
  ERROR:        { label: "Error",        className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  EXPIRED:      { label: "Expired",      className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  SYNCING:      { label: "Syncing",      className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  COMING_SOON:  { label: "Coming soon",  className: "bg-muted text-muted-foreground border-border" },
};
