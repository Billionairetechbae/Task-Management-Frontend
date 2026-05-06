import { HarmonyAssessmentDefinition } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

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
  const questions = definition.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] : undefined;

  const answeredCount = questions.filter((q) => !!answers[q.id]).length;
  const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const currentDimension = definition.dimensions.find(
    (dimension) => dimension.key === currentQuestion?.dimensionKey
  );

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;
  const canMoveForward = !!selectedOptionId;
  const canSubmit = questions.every((q) => !!answers[q.id]);

  if (!currentQuestion) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">No assessment question found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-4 border-b p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">
              {currentDimension?.label || "Harmony"}
            </Badge>

            <h3 className="text-2xl font-bold tracking-tight">{definition.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {definition.instructions}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            <p className="text-xs text-muted-foreground">{answeredCount} answered</p>
          </div>
        </div>

        <Progress value={progress} />
      </CardHeader>

      <CardContent className="p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <p className="text-sm font-medium text-primary">{currentQuestion.title}</p>
            <h4 className="mt-2 text-xl font-semibold leading-7">{currentQuestion.text}</h4>
          </div>

          <RadioGroup
            value={selectedOptionId}
            onValueChange={(value) => onSelect(currentQuestion.id, value)}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => {
              const selected = selectedOptionId === option.id;

              return (
                <Label
                  key={option.id}
                  htmlFor={option.id}
                  className={[
                    "flex cursor-pointer gap-4 rounded-xl border p-4 transition",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "bg-background hover:bg-muted/40",
                  ].join(" ")}
                >
                  <RadioGroupItem value={option.id} id={option.id} className="mt-1" />

                  <div className="flex-1">
                    <p className="text-sm leading-6">{option.text}</p>
                  </div>

                  {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </Label>
              );
            })}
          </RadioGroup>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={onBack} disabled={isFirst}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              {!isLast && (
                <Button onClick={onNext} disabled={!canMoveForward}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {isLast && (
                <Button onClick={onSubmit} disabled={!canSubmit}>
                  Submit Assessment
                </Button>
              )}
            </div>
          </div>

          {!canSubmit && isLast && (
            <p className="text-sm text-muted-foreground">
              Please answer all questions before submitting.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HarmonyAssessment;