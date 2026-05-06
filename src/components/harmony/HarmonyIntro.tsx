import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, RefreshCw, Users } from "lucide-react";

interface HarmonyIntroProps {
  hasProfile: boolean;
  onGetStarted: () => void;
  onViewProfile: () => void;
}

const HarmonyIntro = ({ hasProfile, onGetStarted, onViewProfile }: HarmonyIntroProps) => {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardContent className="grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">Harmony Work Style Index</p>
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
              Understand how you work best with others
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Harmony helps you identify your natural work style, then uses that profile to support better collaboration across every workspace you belong to.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-4">
              <BadgeCheck className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">16 questions</p>
              <p className="mt-1 text-xs text-muted-foreground">Simple work-style scenarios.</p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <RefreshCw className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Global profile</p>
              <p className="mt-1 text-xs text-muted-foreground">One result across all workspaces.</p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <Users className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Team insights</p>
              <p className="mt-1 text-xs text-muted-foreground">See alignment and working norms.</p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">Instruction for Respondents</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This assessment measures your natural work style preferences, how you typically approach work and collaboration. There are no right or wrong answers. Please select the option that best describes your genuine preferences, not what you think is expected or ideal. Consider how you naturally behave in most work situations, not exceptional circumstances.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onGetStarted}>
              {hasProfile ? "Retake Assessment" : "Take Assessment"}
            </Button>

            {hasProfile && (
              <Button variant="outline" onClick={onViewProfile}>
                View My Profile
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted p-6">
          <div className="rounded-2xl border bg-background/80 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What Harmony shows
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">Your archetype</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A practical summary of how you naturally approach work.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold">Your collaboration style</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  How others can work with you more effectively.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold">Workspace compatibility</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  How team members align, differ, and can set better working norms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HarmonyIntro;