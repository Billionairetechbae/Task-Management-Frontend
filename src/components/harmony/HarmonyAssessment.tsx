import { HarmonyAssessmentDefinition } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

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
    <Card className="relative rounded-3xl overflow-hidden border-0 shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-fuchsia-500/5 pointer-events-none" />

      <CardHeader className="relative space-y-4 border-b p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge
              variant="secondary"
              className="mb-3 bg-gradient-to-r from-primary/15 to-fuchsia-500/15 text-primary border-primary/20"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {currentDimension?.label || "Harmony"}
            </Badge>

            <h3 className="text-2xl font-bold tracking-tight">{definition.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {definition.instructions}
            </p>
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-fuchsia-500/10 px-4 py-3 text-sm shrink-0">
            <p className="font-semibold">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            <p className="text-xs text-muted-foreground">{answeredCount} answered</p>
          </div>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-rose-500 transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground text-right">{progress}% complete</p>
        </div>
      </CardHeader>

      <CardContent className="relative p-6">
        <div
          key={currentQuestion.id}
          className="mx-auto max-w-3xl space-y-6 animate-fade-in"
        >
          <div>
            <p className="text-sm font-medium text-primary">{currentQuestion.title}</p>
            <h4 className="mt-2 text-xl md:text-2xl font-semibold leading-8">
              {currentQuestion.text}
            </h4>
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
                    "group flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all duration-200 animate-fade-in",
                    selected
                      ? "border-primary bg-gradient-to-r from-primary/10 via-fuchsia-500/5 to-transparent shadow-md scale-[1.01]"
                      : "bg-background/60 backdrop-blur hover:bg-muted/50 hover:border-foreground/30 hover:-translate-y-0.5 hover:shadow-sm",
                  ].join(" ")}
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
                >
                  <RadioGroupItem value={option.id} id={option.id} className="mt-1" />

                  <div className="flex-1">
                    <p className="text-sm leading-6">{option.text}</p>
                  </div>

                  {selected && (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 animate-scale-in" />
                  )}
                </Label>
              );
            })}
          </RadioGroup>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={onBack} disabled={isFirst} className="hover-scale">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              {!isLast && (
                <Button
                  onClick={onNext}
                  disabled={!canMoveForward}
                  className="bg-gradient-to-r from-primary via-fuchsia-500 to-rose-500 text-white border-0 shadow-md hover:shadow-lg hover-scale disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {isLast && (
                <Button
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="bg-gradient-to-r from-emerald-500 via-primary to-fuchsia-500 text-white border-0 shadow-md hover:shadow-lg hover-scale disabled:opacity-50"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Submit Assessment
                </Button>
              )}
            </div>
          </div>

          {!canSubmit && isLast && (
            <p className="text-sm text-muted-foreground text-center">
              Please answer all questions before submitting.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HarmonyAssessment;
