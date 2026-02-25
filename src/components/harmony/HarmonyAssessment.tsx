import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface HarmonyAssessmentDefinition {
  schemaVersion?: string;
  assessment: {
    title?: string;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{
        id: string;
        label: string;
        text: string;
      }>;
    }>;
  };
}

interface HarmonyAssessmentProps {
  definition: HarmonyAssessmentDefinition;
  currentIndex: number;
  answers: Record<string, string>;
  onSelect: (questionId: string, optionId: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

const HarmonyAssessment = ({
  definition,
  currentIndex,
  answers,
  onSelect,
  onNext,
  onBack,
  onSubmit,
}: HarmonyAssessmentProps) => {
  const questions = definition?.assessment?.questions || [];
  const total = questions.length || 1;
  const current = questions[currentIndex];
  const selected = answers[current?.id || ""] || "";

  const percent = useMemo(() => Math.round(((currentIndex + 1) / total) * 100), [currentIndex, total]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 text-sm text-muted-foreground">
        Question {currentIndex + 1} of {total} • {percent}%
      </div>
      <Progress value={percent} className="mb-6" />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{current?.prompt}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {current?.options?.map((opt) => (
              <button
                key={opt.id}
                className={`w-full text-left border rounded-lg p-4 transition-all ${
                  selected === opt.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => onSelect(current.id, opt.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-muted text-xs font-semibold">
                    {opt.label}
                  </span>
                  <div className="font-medium">{opt.text}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onBack} disabled={currentIndex === 0}>
              Back
            </Button>
            {currentIndex < total - 1 ? (
              <Button onClick={onNext} disabled={!selected}>
                Next
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={!selected}>
                Submit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HarmonyAssessment;
