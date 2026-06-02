import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, RefreshCw, Users, Sparkles, Compass, Heart } from "lucide-react";

interface HarmonyIntroProps {
  hasProfile: boolean;
  onGetStarted: () => void;
  onViewProfile: () => void;
}

const HarmonyIntro = ({ hasProfile, onGetStarted, onViewProfile }: HarmonyIntroProps) => {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-0 shadow-xl animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-rose-500/10" />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <CardContent className="relative grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <div className="space-y-5">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Harmony Work Style Index
            </p>
            <h3 className="text-2xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-primary to-fuchsia-500 bg-clip-text text-transparent">
              Understand how you work best with others
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Harmony helps you identify your natural work style, then uses that profile to support better collaboration across every workspace you belong to.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: BadgeCheck,
                title: "16 questions",
                desc: "Simple work-style scenarios.",
                gradient: "from-emerald-500/15 to-teal-500/10",
                color: "text-emerald-600 dark:text-emerald-400",
              },
              {
                icon: RefreshCw,
                title: "Global profile",
                desc: "One result across all workspaces.",
                gradient: "from-blue-500/15 to-indigo-500/10",
                color: "text-blue-600 dark:text-blue-400",
              },
              {
                icon: Users,
                title: "Team insights",
                desc: "See alignment and working norms.",
                gradient: "from-fuchsia-500/15 to-pink-500/10",
                color: "text-fuchsia-600 dark:text-fuchsia-400",
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`rounded-2xl border bg-gradient-to-br ${f.gradient} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-fade-in`}
                  style={{ animationDelay: `${100 + i * 80}ms`, animationFillMode: "both" }}
                >
                  <Icon className={`mb-3 h-5 w-5 ${f.color}`} />
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-fuchsia-500/5 p-4">
            <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              Instruction for Respondents
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This assessment measures your natural work style preferences, how you typically approach work and collaboration. There are no right or wrong answers. Please select the option that best describes your genuine preferences, not what you think is expected or ideal. Consider how you naturally behave in most work situations, not exceptional circumstances.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-primary via-fuchsia-500 to-rose-500 text-white shadow-md hover:shadow-lg hover-scale border-0"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {hasProfile ? "Retake Assessment" : "Take Assessment"}
            </Button>

            {hasProfile && (
              <Button variant="outline" onClick={onViewProfile} className="hover-scale">
                View My Profile
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-gradient-to-br from-primary/20 via-background to-fuchsia-500/15 p-6">
          <div className="rounded-2xl border bg-background/90 backdrop-blur p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5" />
              What Harmony shows
            </p>

            <div className="mt-4 space-y-4">
              {[
                {
                  title: "Your archetype",
                  desc: "A practical summary of how you naturally approach work.",
                  color: "bg-emerald-500",
                },
                {
                  title: "Your collaboration style",
                  desc: "How others can work with you more effectively.",
                  color: "bg-blue-500",
                },
                {
                  title: "Workspace compatibility",
                  desc: "How team members align, differ, and can set better working norms.",
                  color: "bg-fuchsia-500",
                },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className="flex gap-3 animate-fade-in"
                  style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: "both" }}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HarmonyIntro;
