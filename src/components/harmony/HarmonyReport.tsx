import { HarmonyDimensionKey, HarmonyProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays,
  RefreshCw,
  Sparkles,
  Zap,
  Compass,
  Users,
  MessageSquare,
  TrendingUp,
  ShieldAlert,
  Lightbulb,
  Sun,
  Briefcase,
  Rocket,
  CheckCircle2,
  XCircle,
  Star,
} from "lucide-react";

interface HarmonyReportProps {
  profile: HarmonyProfile;
  onRetake: () => void;
}

const dimensionMeta: Record<
  HarmonyDimensionKey,
  { label: string; gradient: string; icon: any; accent: string }
> = {
  pace_orientation: {
    label: "Pace Orientation",
    gradient: "from-rose-500/15 via-orange-500/10 to-amber-400/15",
    accent: "text-rose-500",
    icon: Zap,
  },
  structure_preference: {
    label: "Structure Preference",
    gradient: "from-blue-500/15 via-indigo-500/10 to-violet-500/15",
    accent: "text-indigo-500",
    icon: Compass,
  },
  interaction_mode: {
    label: "Interaction Mode",
    gradient: "from-emerald-500/15 via-teal-500/10 to-cyan-500/15",
    accent: "text-emerald-500",
    icon: Users,
  },
  feedback_orientation: {
    label: "Feedback Orientation",
    gradient: "from-fuchsia-500/15 via-pink-500/10 to-rose-500/15",
    accent: "text-fuchsia-500",
    icon: MessageSquare,
  },
};

const formatDate = (date?: string) => {
  if (!date) return "Not available";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
};

const safe = (v: any) => (typeof v === "string" ? { text: v } : v);
const arr = (v: any) => (Array.isArray(v) ? v : []);
const str = (v: any) => (v ? String(v) : "");

type SectionTheme = {
  gradient: string;
  iconBg: string;
  iconColor: string;
  border: string;
  icon: any;
};

const sectionThemes: Record<string, SectionTheme> = {
  strength: {
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    icon: TrendingUp,
  },
  risk: {
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    icon: ShieldAlert,
  },
  collaborationTip: {
    gradient: "from-sky-500/10 via-blue-500/5 to-transparent",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
    icon: Lightbulb,
  },
  bestWorkCondition: {
    gradient: "from-violet-500/10 via-purple-500/5 to-transparent",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
    icon: Sun,
  },
  suggestedRole: {
    gradient: "from-indigo-500/10 via-blue-500/5 to-transparent",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
    icon: Briefcase,
  },
  nextAction: {
    gradient: "from-pink-500/10 via-rose-500/5 to-transparent",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/20",
    icon: Rocket,
  },
  do: {
    gradient: "from-green-500/10 via-emerald-500/5 to-transparent",
    iconBg: "bg-green-500/15",
    iconColor: "text-green-600 dark:text-green-400",
    border: "border-green-500/20",
    icon: CheckCircle2,
  },
  dont: {
    gradient: "from-red-500/10 via-rose-500/5 to-transparent",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    icon: XCircle,
  },
};

const StructuredListCard = ({
  title,
  items,
  type,
  themeKey,
  delay = 0,
}: {
  title: string;
  items: any[];
  type: "strength" | "risk" | "collaborationTip" | "bestWorkCondition" | "suggestedRole" | "nextAction" | "other";
  themeKey: keyof typeof sectionThemes;
  delay?: number;
}) => {
  const theme = sectionThemes[themeKey];
  const Icon = theme.icon;

  return (
    <Card
      className={`rounded-2xl overflow-hidden border ${theme.border} bg-gradient-to-br ${theme.gradient} backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${theme.iconBg} ${theme.iconColor}`}>
            <Icon className="h-5 w-5" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items?.length ? (
          <ul className="space-y-2.5">
            {items.map((item, index) => {
              const s = safe(item);
              return (
                <li
                  key={`${title}-${index}`}
                  className="rounded-xl border bg-background/70 backdrop-blur p-3 transition-all duration-200 hover:bg-background hover:shadow-sm hover:border-foreground/20"
                >
                  {(type === "strength" || type === "risk") && (
                    <>
                      <p className="font-medium text-sm">{s.title || s.text || ""}</p>
                      {s.whatItMeans && <p className="text-xs text-muted-foreground mt-1">{s.whatItMeans}</p>}
                      {s.evidence && <p className="text-xs text-muted-foreground mt-1">Evidence: {s.evidence}</p>}
                      {type === "risk" && s.mitigation && (
                        <p className="text-xs text-muted-foreground mt-1">Mitigation: {s.mitigation}</p>
                      )}
                    </>
                  )}
                  {type === "collaborationTip" && (
                    <>
                      <p className="font-medium text-sm">{s.tip || s.text || ""}</p>
                      {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                      {s.example && <p className="text-xs text-muted-foreground mt-1">Example: {s.example}</p>}
                    </>
                  )}
                  {type === "bestWorkCondition" && (
                    <>
                      <p className="font-medium text-sm">{s.condition || s.text || ""}</p>
                      {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                    </>
                  )}
                  {type === "suggestedRole" && (
                    <>
                      <p className="font-medium text-sm">{s.role || s.text || ""}</p>
                      {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                    </>
                  )}
                  {type === "nextAction" && (
                    <>
                      <p className="font-medium text-sm">{s.action || s.text || ""}</p>
                      {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                      {s.successSignal && (
                        <p className="text-xs text-muted-foreground mt-1">Success signal: {s.successSignal}</p>
                      )}
                    </>
                  )}
                  {type === "other" && <p className="text-sm">{s.text || String(item)}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No guidance available.</p>
        )}
      </CardContent>
    </Card>
  );
};

const HarmonyReport = ({ profile, onRetake }: HarmonyReportProps) => {
  const report = profile.report;

  const dimensionEntries = Object.entries(report.dimensionSummary || {}) as Array<
    [HarmonyDimensionKey, any]
  >;

  return (
    <div className="space-y-5">
      {/* Hero archetype card */}
      <Card className="relative overflow-hidden rounded-3xl border-0 shadow-xl animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-fuchsia-500 to-rose-500" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <CardContent className="relative p-6 md:p-8 text-white">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur hover:bg-white/30">
                <Sparkles className="mr-1.5 h-3 w-3" />
                {profile.archetype}
              </Badge>
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight drop-shadow-sm">
                Your Harmony Profile
              </h3>
              <p className="max-w-3xl text-sm md:text-base leading-relaxed text-white/90">
                {str(report.summary)}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <CalendarDays className="h-4 w-4" />
                Completed {formatDate(profile.completedAt)}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={onRetake}
              className="bg-white text-foreground hover:bg-white/90 shadow-md hover-scale shrink-0"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake Assessment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Archetype meaning */}
      {report.archetypeMeaning && (
        <Card
          className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-fuchsia-500/5 animate-fade-in"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Star className="h-5 w-5" />
              </span>
              Your Archetype Meaning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              {report.archetypeMeaning.name && (
                <p className="font-semibold text-sm">{report.archetypeMeaning.name}</p>
              )}
              {report.archetypeMeaning.whatItMeans && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-5">
                  {report.archetypeMeaning.whatItMeans}
                </p>
              )}
              {report.archetypeMeaning.howItShowsUp && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-5">
                  <span className="font-medium text-foreground">How it shows up:</span>{" "}
                  {report.archetypeMeaning.howItShowsUp}
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {arr(report.archetypeMeaning.strengths).length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Strengths
                  </p>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                    {arr(report.archetypeMeaning.strengths).map((s: any, i: number) => (
                      <li key={`archetype-strength-${i}`}>
                        {typeof s === "string" ? s : s.text || s.title || ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {arr(report.archetypeMeaning.watchOuts).length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Watch outs
                  </p>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                    {arr(report.archetypeMeaning.watchOuts).map((w: any, i: number) => (
                      <li key={`archetype-watchout-${i}`}>
                        {typeof w === "string" ? w : w.text || w.title || ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dimensions */}
      <div className="grid gap-4 md:grid-cols-2">
        {dimensionEntries.map(([key, item], idx) => {
          const meta = dimensionMeta[key] || {
            label: key,
            gradient: "from-primary/10 via-background to-background",
            accent: "text-primary",
            icon: Sparkles,
          };
          const Icon = meta.icon;
          const pct = item.displayPercentage || 0;

          return (
            <Card
              key={key}
              className={`rounded-2xl overflow-hidden border bg-gradient-to-br ${meta.gradient} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in`}
              style={{ animationDelay: `${120 + idx * 60}ms`, animationFillMode: "both" }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 backdrop-blur ${meta.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{meta.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.band}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-2xl font-bold ${meta.accent}`}>{item.score}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">out of 5</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-background/60">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-rose-500 transition-[width] duration-1000 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{pct}%</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Insight cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard title="Strengths" items={arr(report.strengths)} type="strength" themeKey="strength" delay={200} />
        <StructuredListCard
          title="Watch-outs"
          items={arr(report.challenges || report.risks)}
          type="risk"
          themeKey="risk"
          delay={260}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard
          title="Collaboration Tips"
          items={arr(report.collaborationTips || report.collaborationStyle)}
          type="collaborationTip"
          themeKey="collaborationTip"
          delay={320}
        />
        <StructuredListCard
          title="Best Work Conditions"
          items={arr(report.bestWorkConditions)}
          type="bestWorkCondition"
          themeKey="bestWorkCondition"
          delay={380}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard
          title="How others can work well with you"
          items={arr(report.do)}
          type="other"
          themeKey="do"
          delay={440}
        />
        <StructuredListCard
          title="What others should avoid"
          items={arr(report.dont)}
          type="other"
          themeKey="dont"
          delay={500}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard
          title="Suggested Roles"
          items={arr(report.suggestedRoles || report.idealTeamRoles)}
          type="suggestedRole"
          themeKey="suggestedRole"
          delay={560}
        />
        <StructuredListCard
          title="Next Actions"
          items={arr(report.nextActions)}
          type="nextAction"
          themeKey="nextAction"
          delay={620}
        />
      </div>

      <Card className="rounded-2xl border-dashed bg-muted/30">
        <CardContent className="py-4">
          <p className="text-xs leading-5 text-muted-foreground text-center">
            This profile is saved globally to your account and will be used across every workspace where you are a
            member.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HarmonyReport;
