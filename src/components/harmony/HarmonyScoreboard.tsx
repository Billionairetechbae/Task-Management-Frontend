import { HarmonyDimensionKey, HarmonyScoreboardData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Users } from "lucide-react";

interface HarmonyScoreboardProps {
  data?: HarmonyScoreboardData;
  loading?: boolean;
  onRefresh: () => void;
  onTakeAssessment?: () => void;
  currentUserHasProfile?: boolean;
}

const dimensionLabels: Record<HarmonyDimensionKey, string> = {
  pace_orientation: "Pace",
  structure_preference: "Structure",
  interaction_mode: "Interaction",
  feedback_orientation: "Feedback",
};

const getUserName = (user: any) => {
  if (!user) return "Unknown user";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.name || fullName || user.email || "Unknown user";
};

const ScoreCircle = ({ score }: { score: number | null | undefined }) => {
  const value = typeof score === "number" ? score : 0;

  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-full border bg-muted/30">
      <div className="text-center">
        <p className="text-3xl font-bold">{score === null || score === undefined ? "—" : value}</p>
        <p className="text-xs text-muted-foreground">score</p>
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
      <Card className="rounded-2xl">
        <CardContent className="flex min-h-[260px] items-center justify-center p-8">
          <div className="text-center">
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
        <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
          <Users className="mb-4 h-8 w-8 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No team report loaded</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Select a workspace and refresh to view team-level Harmony insights.
          </p>
          <Button className="mt-5" onClick={onRefresh}>
            Load Team Harmony
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasEnoughProfiles = typeof data.cohesionScore === "number";

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ScoreCircle score={data.cohesionScore} />

            <div>
              <h3 className="text-2xl font-bold tracking-tight">Team Harmony Report</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {data.interpretation || "Harmony report is available for the active workspace."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{data.teamSize || 0} team members</Badge>
                <Badge variant="secondary">{data.completedCount || 0} completed</Badge>
                <Badge variant="secondary">{data.missingCount || 0} pending</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!currentUserHasProfile && onTakeAssessment && (
              <Button onClick={onTakeAssessment}>Take Assessment</Button>
            )}

            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasEnoughProfiles && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardContent className="p-5">
            <p className="font-semibold text-amber-900">
              At least 2 completed Harmony profiles are required.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Invite more team members to complete the assessment so the workspace can generate compatibility insights.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total members</p>
            <p className="mt-2 text-3xl font-bold">{data.teamSize || 0}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="mt-2 text-3xl font-bold">{data.completedCount || 0}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="mt-2 text-3xl font-bold">{data.missingCount || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Archetype distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.archetypeDistribution?.length ? (
              data.archetypeDistribution.map((item) => (
                <div key={item.archetype} className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-sm font-medium">{item.archetype}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No completed archetypes yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Dimension averages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.entries(data.dimensionAverages || {}) as Array<[HarmonyDimensionKey, number]>).map(
              ([key, value]) => (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{dimensionLabels[key] || key}</span>
                    <span className="font-semibold">{value}/5</span>
                  </div>
                  <Progress value={Math.round(((value - 1) / 4) * 100)} />
                </div>
              )
            )}

            {!Object.keys(data.dimensionAverages || {}).length && (
              <p className="text-sm text-muted-foreground">No dimension data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Strongest alignment areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.strongestAlignmentAreas?.length ? (
              data.strongestAlignmentAreas.map((item) => (
                <div key={item.dimensionKey} className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">{dimensionLabels[item.dimensionKey]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No alignment areas available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Likely friction areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.likelyFrictionAreas?.length ? (
              data.likelyFrictionAreas.map((item) => (
                <div key={item.dimensionKey} className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">{dimensionLabels[item.dimensionKey]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No friction areas available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Recommended team norms</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recommendedTeamNorms?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.recommendedTeamNorms.map((norm, index) => (
                <div key={index} className="rounded-xl border bg-muted/30 p-4 text-sm leading-6">
                  {norm}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recommendations available yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Member compatibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pairwiseCompatibility?.length ? (
            data.pairwiseCompatibility.map((pair, index) => (
              <div key={index} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {getUserName(pair.userA)} × {getUserName(pair.userB)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pair.archetypeA} × {pair.archetypeB}
                    </p>
                    {pair.dynamicNote && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {pair.dynamicNote}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge>{pair.compatibilityScore}%</Badge>
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
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Pending members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingMembers.map((member: any) => (
              <div key={member.id || member.email} className="flex items-center justify-between rounded-xl border p-3">
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