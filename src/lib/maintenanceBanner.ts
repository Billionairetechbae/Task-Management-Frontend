// Shared Maintenance & Service Announcement banner core (pure, framework-free).
// KEEP IDENTICAL across admiino-admin, adminno-task-manager and Admiino-Landing-Page: the three apps cannot import from each other,
// and the Super Admin preview must format messages exactly like the public banners. The server is authoritative for WHICH
// announcement shows; this file only validates, formats and remembers browser-local dismissals.

export type BannerStatus = "upcoming" | "ongoing" | "completed";

export interface PublicMaintenance {
  id: string;
  /** Material-change counter. A dismissal is remembered per `${id}:${revision}`, so a materially updated notice shows again. */
  revision: number;
  status: BannerStatus;
  title: string;
  message: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  statusPageUrl: string | null;
  completedAt: string | null;
}

export const BANNER_LABELS: Record<BannerStatus, string> = {
  upcoming: "Upcoming maintenance",
  ongoing: "Maintenance in progress",
  completed: "Maintenance completed",
};

const STATUSES: readonly string[] = ["upcoming", "ongoing", "completed"];
const asString = (v: unknown, max: number): string | null =>
  typeof v === "string" ? v.slice(0, max) : null;
const asInstant = (v: unknown): string | null =>
  typeof v === "string" && !Number.isNaN(new Date(v).getTime()) ? v : null;

/** Defensive parse of `GET /system/maintenance/active`. Anything unexpected reads as "no announcement". Never throws. */
export function parseActiveResponse(
  payload: unknown,
): PublicMaintenance | null {
  try {
    const a = (payload as { data?: { announcement?: unknown } } | null)?.data
      ?.announcement as Record<string, unknown> | null | undefined;
    if (!a || typeof a !== "object") return null;
    const id = asString(a.id, 64);
    const title = asString(a.title, 120);
    const message = asString(a.message, 1000);
    if (
      !id ||
      !title ||
      !message ||
      typeof a.revision !== "number" ||
      !Number.isFinite(a.revision) ||
      typeof a.status !== "string" ||
      !STATUSES.includes(a.status)
    )
      return null;
    return {
      id,
      revision: a.revision,
      status: a.status as BannerStatus,
      title,
      message,
      startsAt: asInstant(a.startsAt),
      endsAt: asInstant(a.endsAt),
      timezone: asString(a.timezone, 64) || "Africa/Lagos",
      statusPageUrl: safeStatusUrl(a.statusPageUrl),
      completedAt: asInstant(a.completedAt),
    };
  } catch {
    return null;
  }
}

/** Only absolute https URLs without credentials are ever rendered as links; anything else is dropped (no broken or unsafe link). */
export function safeStatusUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2048)
    return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname.includes(".")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export const bannerKey = (
  a: Pick<PublicMaintenance, "id" | "revision">,
): string => `${a.id}:${a.revision}`;

/** Ongoing maintenance can never be hidden; upcoming and completed notices may be dismissed. */
export const isDismissible = (status: BannerStatus): boolean =>
  status !== "ongoing";

function zoneName(date: Date, timezone: string, locale?: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value || timezone;
}

/** "Nov 18, 2026, 3:00 AM WAT" in the announcement's zone and the viewer's locale. Offset-only names ("GMT+1") also show the IANA zone. Never throws. */
export function formatInZone(
  iso: string,
  timezone: string,
  locale?: string,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // dateStyle/timeStyle cannot be combined with timeZoneName, so the components are spelled out.
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  for (const [zone, loc] of [
    [timezone, locale],
    [timezone, undefined],
    ["UTC", undefined],
  ] as const) {
    try {
      const text = new Intl.DateTimeFormat(loc, {
        ...options,
        timeZone: zone,
      }).format(date);
      return /^(GMT|UTC)[+\-\u2212]/.test(zoneName(date, zone, loc))
        ? `${text} · ${zone.replace(/_/g, " ")}`
        : text;
    } catch {
      /* unsupported zone or locale: try the next fallback */
    }
  }
  return date.toISOString();
}

/** The schedule line under the message; null when there is nothing useful to say. */
export function scheduleLine(
  a: PublicMaintenance,
  locale?: string,
): string | null {
  const start = a.startsAt ? formatInZone(a.startsAt, a.timezone, locale) : "";
  const end = a.endsAt ? formatInZone(a.endsAt, a.timezone, locale) : "";
  if (a.status === "upcoming")
    return start && end
      ? `Scheduled: ${start} to ${end}`
      : start
        ? `Scheduled: ${start}`
        : null;
  if (a.status === "ongoing")
    return end ? `Estimated completion: ${end}` : null;
  return null;
}

// ---------- browser-local dismissal (non-sensitive: only `${id}:${revision}` keys) ----------
export const DISMISS_STORAGE_KEY = "admiino.maintenance.dismissed.v1";
const MAX_REMEMBERED = 20;
const memory = new Set<string>(); // used when storage is unavailable (private mode, blocked, quota)

export interface KeyValueStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
const browserStorage = (): KeyValueStorage | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

function readKeys(storage: KeyValueStorage | null): string[] {
  const keys = new Set<string>(memory);
  try {
    const parsed = JSON.parse(storage?.getItem(DISMISS_STORAGE_KEY) || "[]");
    if (Array.isArray(parsed))
      parsed.forEach(
        (k) => typeof k === "string" && k.length <= 100 && keys.add(k),
      );
  } catch {
    /* corrupt or unavailable: fall back to memory only */
  }
  return [...keys];
}

export function isDismissed(
  a: PublicMaintenance,
  storage: KeyValueStorage | null = browserStorage(),
): boolean {
  return isDismissible(a.status) && readKeys(storage).includes(bannerKey(a));
}

export function dismiss(
  a: PublicMaintenance,
  storage: KeyValueStorage | null = browserStorage(),
): void {
  if (!isDismissible(a.status)) return;
  const key = bannerKey(a);
  memory.add(key);
  try {
    storage?.setItem(
      DISMISS_STORAGE_KEY,
      JSON.stringify(
        [...readKeys(storage).filter((k) => k !== key), key].slice(
          -MAX_REMEMBERED,
        ),
      ),
    );
  } catch {
    /* memory fallback already holds it */
  }
}

export const __resetDismissMemoryForTests = (): void => memory.clear();
