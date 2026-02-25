import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Category {
  key: string;
  label: string;
  percent: number;
}

interface ScoreboardData {
  cohesionScore: number;
  label: string;
  categories: Category[];
  note?: string;
  totalSubmissions?: number;
  submissionsCount?: number;
}

const HarmonyScoreboard = ({
  data,
  loading,
  onRefresh,
}: {
  data?: ScoreboardData;
  loading?: boolean;
  onRefresh: () => void;
}) => {
  const submissions =
    (data?.submissionsCount !== undefined ? data.submissionsCount : undefined) ??
    (data?.totalSubmissions !== undefined ? data.totalSubmissions : undefined);
  if (!data || (typeof submissions === "number" && submissions < 2)) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <div className="text-lg font-medium mb-2">Not enough completed assessments yet.</div>
          <p className="text-sm text-muted-foreground">
            Ask at least two teammates to complete their Harmony assessment to see team insights.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={onRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories = data.categories?.length
    ? data.categories
    : [
        { key: "communication", label: "Communication Alignment", percent: 0 },
        { key: "work_style", label: "Work Style Compatibility", percent: 0 },
        { key: "decision_making", label: "Decision-Making Harmony", percent: 0 },
        { key: "feedback_culture", label: "Feedback Culture", percent: 0 },
      ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Cohesion</CardTitle>
          <Button variant="outline" onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="text-5xl font-bold">{Math.round(data.cohesionScore)}</div>
            <div className="text-muted-foreground">{data.label}</div>
          </div>
          <p className="text-sm text-muted-foreground">{data.note || "Team compatibility overview across key dimensions."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.key}>
              <div className="flex justify-between text-sm mb-1">
                <span>{cat.label}</span>
                <span className="text-muted-foreground">{Math.round(cat.percent)}%</span>
              </div>
              <Progress value={cat.percent} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default HarmonyScoreboard;
