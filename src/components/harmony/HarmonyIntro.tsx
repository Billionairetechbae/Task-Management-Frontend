import { Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface HarmonyIntroProps {
  onGetStarted: () => void;
  hasReport: boolean;
  onViewReport: () => void;
}

const HarmonyIntro = ({ onGetStarted, hasReport, onViewReport }: HarmonyIntroProps) => {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
            <Users className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl">Harmony: Team Compatibility Assessment</CardTitle>
          <CardDescription className="text-base">
            Understand your collaboration style and learn how to get the best out of teamwork.
            Answer 16 quick questions to generate your Harmony Profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button className="gap-2" onClick={onGetStarted}>
            <Sparkles className="w-4 h-4" />
            Get Started
          </Button>
          {hasReport && (
            <Button variant="outline" onClick={onViewReport}>
              View My Profile
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HarmonyIntro;
