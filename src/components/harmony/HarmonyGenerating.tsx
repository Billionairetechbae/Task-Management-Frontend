import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const HarmonyGenerating = () => {
  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardContent className="py-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-lg font-medium">Generating your Harmony Profile...</div>
          <p className="text-sm text-muted-foreground">
            This usually takes a few seconds. Sit tight while we craft your report.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HarmonyGenerating;
