// Presentational maintenance banner. KEEP IDENTICAL across admiino-admin, adminno-task-manager and Admiino-Landing-Page (see lib/maintenanceBanner.ts).
// Plain-text only: the announcement is rendered as React text, never as HTML.
import { AlertTriangle, CalendarClock, CheckCircle2, X } from "lucide-react";
import {
  BANNER_LABELS,
  isDismissible,
  safeStatusUrl,
  scheduleLine,
  type PublicMaintenance,
} from "@/lib/maintenanceBanner";

const TONE = {
  upcoming:
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-50",
  ongoing: "border-red-800 bg-red-600 text-white dark:bg-red-700",
  completed:
    "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-50",
} as const;
const ICON = {
  upcoming: CalendarClock,
  ongoing: AlertTriangle,
  completed: CheckCircle2,
} as const;

export interface MaintenanceBannerViewProps {
  announcement: PublicMaintenance;
  /** Omit to render without a dismiss control. It is ignored for ongoing maintenance, which can never be hidden. */
  onDismiss?: () => void;
  locale?: string;
  className?: string;
}

export function MaintenanceBannerView({
  announcement,
  onDismiss,
  locale,
  className = "",
}: MaintenanceBannerViewProps) {
  const Icon = ICON[announcement.status];
  const schedule = scheduleLine(announcement, locale);
  const url = safeStatusUrl(announcement.statusPageUrl);
  const canDismiss = !!onDismiss && isDismissible(announcement.status);
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={BANNER_LABELS[announcement.status]}
      data-maintenance-banner={announcement.status}
      className={`w-full max-w-full overflow-hidden border-b ${TONE[announcement.status]} ${className}`}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl items-start gap-3 px-4 py-2.5 sm:px-6">
        <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 text-sm leading-snug [overflow-wrap:anywhere]">
          <p>
            <span className="font-semibold">
              {BANNER_LABELS[announcement.status]}
            </span>
            <span aria-hidden="true"> — </span>
            <span className="sr-only">: </span>
            <span className="font-medium">{announcement.title}</span>
          </p>
          <p className="mt-0.5 whitespace-pre-line">{announcement.message}</p>
          {schedule && <p className="mt-1 text-xs opacity-90">{schedule}</p>}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              View status page
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
        {canDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss maintenance notice"
            className="-mr-1.5 -mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 dark:hover:bg-white/10"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}

export default MaintenanceBannerView;
