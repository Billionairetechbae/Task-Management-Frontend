import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const HarmonyGenerating = () => {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-5 rounded-full bg-primary/10 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>

        <h3 className="text-2xl font-bold">Building your Harmony profile</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          We are saving your latest work style profile and preparing your practical collaboration insights.
        </p>
      </CardContent>
    </Card>
  );
};

export default HarmonyGenerating;