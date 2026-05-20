import { HarmonyDimensionKey, HarmonyProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, RefreshCw } from "lucide-react";

interface HarmonyReportProps {
  profile: HarmonyProfile;
  onRetake: () => void;
}

const dimensionLabels: Record<HarmonyDimensionKey, string> = {
  pace_orientation: "Pace Orientation",
  structure_preference: "Structure Preference",
  interaction_mode: "Interaction Mode",
  feedback_orientation: "Feedback Orientation",
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

const StructuredListCard = ({
  title,
  items,
  type,
}: {
  title: string;
  items: any[];
  type: "strength" | "risk" | "collaborationTip" | "bestWorkCondition" | "suggestedRole" | "nextAction" | "other";
}) => (
  <Card className="rounded-2xl">
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {items?.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => {
            const s = safe(item);
            return (
              <li key={`${title}-${index}`} className="border rounded-lg p-3">
                {(type === "strength" || type === "risk") && (
                  <>
                    <p className="font-medium text-sm">{s.title || s.text || ""}</p>
                    {s.whatItMeans && <p className="text-xs text-muted-foreground mt-1">{s.whatItMeans}</p>}
                    {s.evidence && <p className="text-xs text-muted-foreground mt-1">Evidence: {s.evidence}</p>}
                    {type === "risk" && s.mitigation && <p className="text-xs text-muted-foreground mt-1">Mitigation: {s.mitigation}</p>}
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
                    {s.successSignal && <p className="text-xs text-muted-foreground mt-1">Success signal: {s.successSignal}</p>}
                  </>
                )}
                {type === "other" && (
                  <p className="text-sm">{s.text || String(item)}</p>
                )}
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

const HarmonyReport = ({ profile, onRetake }: HarmonyReportProps) => {
  const report = profile.report;

  const dimensionEntries = Object.entries(report.dimensionSummary || {}) as Array<
    [HarmonyDimensionKey, any]
  >;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge className="mb-3">{profile.archetype}</Badge>
              <h3 className="text-3xl font-bold tracking-tight">Your Harmony Profile</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {str(report.summary)}
              </p>

              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Completed {formatDate(profile.completedAt)}
              </div>
            </div>

            <Button variant="outline" onClick={onRetake}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake Assessment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Archetype Meaning */}
      {report.archetypeMeaning && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Your Archetype Meaning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              {report.archetypeMeaning.name && <p className="font-medium text-sm">{report.archetypeMeaning.name}</p>}
              {report.archetypeMeaning.whatItMeans && <p className="text-xs text-muted-foreground mt-1">{report.archetypeMeaning.whatItMeans}</p>}
              {report.archetypeMeaning.howItShowsUp && <p className="text-xs text-muted-foreground mt-1">How it shows up: {report.archetypeMeaning.howItShowsUp}</p>}
            </div>

            {arr(report.archetypeMeaning.strengths).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Strengths:</p>
                <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                  {arr(report.archetypeMeaning.strengths).map((s: any, i: number) => (
                    <li key={`archetype-strength-${i}`}>{typeof s === "string" ? s : s.text || s.title || ""}</li>
                  ))}
                </ul>
              </div>
            )}

            {arr(report.archetypeMeaning.watchOuts).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Watch outs:</p>
                <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                  {arr(report.archetypeMeaning.watchOuts).map((w: any, i: number) => (
                    <li key={`archetype-watchout-${i}`}>{typeof w === "string" ? w : w.text || w.title || ""}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {dimensionEntries.map(([key, item]) => (
          <Card key={key} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{dimensionLabels[key]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.band}</p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold">{item.score}</p>
                  <p className="text-xs text-muted-foreground">out of 5</p>
                </div>
              </div>

              <Progress value={item.displayPercentage || 0} className="mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard title="Strengths" items={arr(report.strengths)} type="strength" />
        <StructuredListCard title="Watch-outs" items={arr(report.challenges || report.risks)} type="risk" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard title="Collaboration Tips" items={arr(report.collaborationTips || report.collaborationStyle)} type="collaborationTip" />
        <StructuredListCard title="Best Work Conditions" items={arr(report.bestWorkConditions)} type="bestWorkCondition" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard title="How others can work well with you" items={arr(report.do)} type="other" />
        <StructuredListCard title="What others should avoid" items={arr(report.dont)} type="other" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuredListCard title="Suggested Roles" items={arr(report.suggestedRoles || report.idealTeamRoles)} type="suggestedRole" />
        <StructuredListCard title="Next Actions" items={arr(report.nextActions)} type="nextAction" />
      </div>

      <Card className="rounded-2xl">
        <CardContent>
          <p className="text-xs leading-5 text-muted-foreground">
            This profile is saved globally to your account and will be used across every workspace where you are a member.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HarmonyReport;