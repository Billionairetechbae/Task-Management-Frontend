import { HarmonyDimensionKey, HarmonyScoreboardData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Users,
  Zap,
  Layers,
  MessageCircle,
  Target,
  Sparkles,
  Heart,
  AlertTriangle,
  Compass,
  Award,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HarmonyScoreboardProps {
  data?: HarmonyScoreboardData;
  loading?: boolean;
  onRefresh: () => void;
  onTakeAssessment?: () => void;
  currentUserHasProfile?: boolean;
}

const dimensionMeta: Record<
  HarmonyDimensionKey,
  { label: string; icon: any; gradient: string; accent: string }
> = {
  pace_orientation: {
    label: "Pace",
    icon: Zap,
    gradient: "from-rose-500/15 via-orange-500/10 to-amber-400/15",
    accent: "text-rose-500",
  },
  structure_preference: {
    label: "Structure",
    icon: Layers,
    gradient: "from-blue-500/15 via-cyan-500/10 to-sky-400/15",
    accent: "text-blue-500",
  },
  interaction_mode: {
    label: "Interaction",
    icon: MessageCircle,
    gradient: "from-violet-500/15 via-fuchsia-500/10 to-pink-400/15",
    accent: "text-violet-500",
  },
  feedback_orientation: {
    label: "Feedback",
    icon: Target,
    gradient: "from-emerald-500/15 via-teal-500/10 to-green-400/15",
    accent: "text-emerald-500",
  },
};

const getUserName = (user: any) => {
  if (!user) return "Unknown user";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.name || fullName || user.email || "Unknown user";
};

const ScoreCircle = ({ score }: { score: number | null | undefined }) => {
  const value = typeof score === "number" ? score : 0;
  const pct = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 42;
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative flex h-32 w-32 items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#scoreGradient)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(280 70% 60%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center z-10">
        <p className="text-3xl font-bold bg-gradient-to-br from-primary to-fuchsia-500 bg-clip-text text-transparent">
          {score === null || score === undefined ? "—" : value}
        </p>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">cohesion</p>
      </div>
    </div>
  );
};

const HarmonyScoreboard = ({
  data,
  loading,
  onRefresh,
  onTakeAssessment,
  currentUserHasProfile,
}: HarmonyScoreboardProps) => {
  if (loading) {
    return (
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="flex min-h-[260px] items-center justify-center p-8">
          <div className="text-center animate-fade-in">
            <RefreshCw className="mx-auto mb-4 h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading team Harmony report...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">No team report loaded</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Select a workspace and refresh to view team-level Harmony insights.
          </p>
          <Button className="mt-5 hover-scale" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Load Team Harmony
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasEnoughProfiles = typeof data.cohesionScore === "number";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero card */}
      <Card className="rounded-2xl overflow-hidden relative border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-rose-500/10 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-16 -left-10 w-56 h-56 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />

        <CardContent className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ScoreCircle score={data.cohesionScore} />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[11px] uppercase tracking-wider font-bold text-primary">Team Harmony</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight">Workspace Cohesion Report</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {data.interpretation || "Harmony report is available for the active workspace."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1"><Users className="w-3 h-3" />{data.teamSize || 0} members</Badge>
                <Badge variant="secondary" className="bg-success/15 text-success border-success/30 gap-1">
                  <Award className="w-3 h-3" />{data.completedCount || 0} completed
                </Badge>
                <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/30">
                  {data.missingCount || 0} pending
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!currentUserHasProfile && onTakeAssessment && (
              <Button onClick={onTakeAssessment} className="hover-scale shadow-md gap-2">
                <Sparkles className="w-4 h-4" />
                Take Assessment
              </Button>
            )}
            <Button variant="outline" onClick={onRefresh} className="hover-scale">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasEnoughProfiles && (
        <Card className="rounded-2xl border-amber-300/40 bg-gradient-to-br from-amber-50/60 via-amber-50/30 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20 animate-fade-in">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                At least 2 completed Harmony profiles are required.
              </p>
              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">
                Invite more team members to complete the assessment so the workspace can generate compatibility insights.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total members", value: data.teamSize || 0, icon: Users, gradient: "from-primary/20 to-primary/5" },
          { label: "Completed", value: data.completedCount || 0, icon: Award, gradient: "from-emerald-500/20 to-emerald-500/5" },
          { label: "Pending", value: data.missingCount || 0, icon: TrendingUp, gradient: "from-amber-500/20 to-amber-500/5" },
        ].map((stat, i) => (
          <Card
            key={stat.label}
            className={cn(
              "rounded-2xl overflow-hidden relative transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
              "border-border/60"
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", stat.gradient)} />
            <CardContent className="relative p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              Archetype Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-5">
            {data.archetypeDistribution?.length ? (
              data.archetypeDistribution.map((item, i) => (
                <div
                  key={item.archetype}
                  className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-primary/5 to-transparent p-3 transition-all hover:border-primary/40 hover:shadow-sm"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="text-sm font-medium">{item.archetype}</span>
                  <Badge className="bg-primary/15 text-primary border-primary/30">{item.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No completed archetypes yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-fuchsia-500/5 to-transparent">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-fuchsia-500" />
              Dimension Averages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {(Object.entries(data.dimensionAverages || {}) as Array<[HarmonyDimensionKey, number]>).map(
              ([key, value]) => {
                const meta = dimensionMeta[key];
                const Icon = meta?.icon || Target;
                return (
                  <div key={key}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Icon className={cn("w-3.5 h-3.5", meta?.accent || "text-primary")} />
                        {meta?.label || key}
                      </span>
                      <span className="font-semibold">{value}/5</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-fuchsia-500 to-rose-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.round(((value - 1) / 4) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
            {!Object.keys(data.dimensionAverages || {}).length && (
              <p className="text-sm text-muted-foreground">No dimension data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl overflow-hidden hover:shadow-md transition-shadow border-emerald-500/20">
          <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-transparent">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-500" />
              Strongest Alignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {data.strongestAlignmentAreas?.length ? (
              data.strongestAlignmentAreas.map((item) => {
                const meta = dimensionMeta[item.dimensionKey];
                const Icon = meta?.icon || Target;
                return (
                  <div
                    key={item.dimensionKey}
                    className={cn("rounded-xl border p-4 bg-gradient-to-br", meta?.gradient || "from-emerald-500/5 to-transparent")}
                  >
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Icon className={cn("w-3.5 h-3.5", meta?.accent || "text-emerald-500")} />
                      {meta?.label || item.dimensionKey}
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-6">{item.note}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No alignment areas available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl overflow-hidden hover:shadow-md transition-shadow border-rose-500/20">
          <CardHeader className="bg-gradient-to-r from-rose-500/10 to-transparent">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Likely Friction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {data.likelyFrictionAreas?.length ? (
              data.likelyFrictionAreas.map((item) => {
                const meta = dimensionMeta[item.dimensionKey];
                const Icon = meta?.icon || Target;
                return (
                  <div
                    key={item.dimensionKey}
                    className="rounded-xl border bg-gradient-to-br from-rose-500/8 to-transparent p-4"
                  >
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Icon className={cn("w-3.5 h-3.5", meta?.accent || "text-rose-500")} />
                      {meta?.label || item.dimensionKey}
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-6">{item.note}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No friction areas available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="bg-gradient-to-r from-violet-500/10 to-transparent">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Recommended Team Norms
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {(() => {
            const safe = (v: any) => (typeof v === "string" ? { text: v } : v);
            const arr = (v: any) => (Array.isArray(v) ? v : []);

            if (!arr(data.recommendedTeamNorms).length) {
              return <p className="text-sm text-muted-foreground">No recommendations available yet.</p>;
            }
            return (
              <div className="grid gap-3 md:grid-cols-2">
                {arr(data.recommendedTeamNorms).map((norm: any, index: number) => {
                  const s = safe(norm);
                  return (
                    <div
                      key={index}
                      className="rounded-xl border bg-gradient-to-br from-violet-500/8 via-card to-card p-4 text-sm leading-6 transition-all hover:border-violet-500/40 hover:shadow-sm"
                    >
                      {s.norm ? (
                        <>
                          <p className="font-medium">{s.norm}</p>
                          {s.why && <p className="text-xs text-muted-foreground mt-1.5">{s.why}</p>}
                          {s.howToImplement && (
                            <p className="text-xs text-muted-foreground mt-1.5">
                              <span className="font-semibold text-foreground/80">How:</span> {s.howToImplement}
                            </p>
                          )}
                        </>
                      ) : (
                        s.text || String(norm)
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card className="rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Member Compatibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {data.pairwiseCompatibility?.length ? (
            data.pairwiseCompatibility.map((pair, index) => (
              <div
                key={index}
                className="rounded-xl border p-4 bg-gradient-to-r from-card via-primary/5 to-card hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {getUserName(pair.userA)} <span className="text-muted-foreground">×</span> {getUserName(pair.userB)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pair.archetypeA} × {pair.archetypeB}
                    </p>
                    {pair.dynamicNote && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{pair.dynamicNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground border-0">
                      {pair.compatibilityScore}%
                    </Badge>
                    <Badge variant="secondary">{pair.dynamicType || "Neutral"}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{pair.interpretation}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Pairwise compatibility will appear when at least two members complete the assessment.
            </p>
          )}
        </CardContent>
      </Card>

      {data.pendingMembers?.length > 0 && (
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-warning/10 to-transparent">
            <CardTitle className="text-base">Pending Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-5">
            {data.pendingMembers.map((member: any) => (
              <div
                key={member.id || member.email}
                className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">{getUserName(member)}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <Badge variant="secondary">Not completed</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HarmonyScoreboard;
