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

const ListCard = ({
  title,
  items,
}: {
  title: string;
  items: string[];
}) => (
  <Card className="rounded-2xl">
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {items?.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-6">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
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
                {report.summary}
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
        <ListCard title="Strengths" items={report.strengths || []} />
        <ListCard title="Watch-outs" items={report.challenges || []} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">How you tend to collaborate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {(report.collaborationStyle || []).map((item, index) => (
              <div key={index} className="rounded-xl border bg-muted/30 p-4 text-sm leading-6">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="How others can work well with you" items={report.do || []} />
        <ListCard title="What others should avoid" items={report.dont || []} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Best-fit contribution areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(report.idealTeamRoles || []).map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>

          <Separator className="my-5" />

          <p className="text-xs leading-5 text-muted-foreground">
            This profile is saved globally to your account and will be used across every workspace where you are a member.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HarmonyReport;