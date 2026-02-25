import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HarmonyIntro from "@/components/harmony/HarmonyIntro";
import HarmonyAssessment from "@/components/harmony/HarmonyAssessment";
import HarmonyGenerating from "@/components/harmony/HarmonyGenerating";
import HarmonyReport from "@/components/harmony/HarmonyReport";
import HarmonyScoreboard from "@/components/harmony/HarmonyScoreboard";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "intro" | "assessment" | "generating" | "report";

interface HarmonyAssessmentDefinition {
  schemaVersion?: string;
  assessment: {
    title?: string;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ id: string; label: string; text: string }>;
    }>;
  };
}

interface ReportData {
  id: string;
  userId: string;
  companyId: string;
  archetype: string;
  summary: string;
  do: string[];
  dont: string[];
  createdAt: string;
  updatedAt: string;
  user?: { firstName?: string; lastName?: string; email?: string };
}

const Harmony = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("intro");
  const [definition, setDefinition] = useState<HarmonyAssessmentDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [report, setReport] = useState<ReportData | null>(null);
  const [scoreboard, setScoreboard] = useState<any | null>(null);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);

  const cacheKey = useMemo(() => {
    const uid = user?.id;
    return uid ? `harmony_latest_submission_user_${uid}` : "harmony_latest_submission_user_fallback";
  }, [user?.id]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.archetype) {
          setReport(parsed);
          setMode("report");
        }
      }
    } catch {}
    api
      .getMyHarmonyLatest()
      .then((res) => {
        const latest = (res as any)?.data?.report;
        if (latest) {
          setReport(latest);
          setMode("report");
          try {
            localStorage.setItem(cacheKey, JSON.stringify(latest));
          } catch {}
        }
      })
      .catch((err: any) => {
        const msg = err?.message || "Unable to load Harmony profile";
        if (!msg.toLowerCase().includes("x-company-id")) {
          toast({ title: "Harmony", description: msg, variant: "destructive" as any });
        }
      });
  }, [cacheKey, toast]);

  const startAssessment = () => {
    api
      .getHarmonyAssessment()
      .then((res) => {
        const raw: any = res;
        const maybe = raw?.data ?? raw;
        let def: any = maybe;
        if (!def?.assessment?.questions && raw?.data?.assessment) {
          def = { schemaVersion: raw?.data?.schemaVersion || "1", assessment: raw.data.assessment };
        }
        console.log("assessment.assessment.questions[0]", def?.assessment?.questions?.[0]);
        setDefinition(def);
        setAnswers({});
        setCurrentIndex(0);
        setMode("assessment");
      })
      .catch((err: any) => {
        toast({ title: "Failed to load assessment", description: err?.message || "Please try again", variant: "destructive" as any });
      });
  };

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    const questions = definition?.assessment?.questions || [];
    console.log("Submitting Harmony answers payload:", answers, questions);
    const payload = questions.map((q) => ({
      questionId: q.id,
      optionId: answers[q.id],
    }));

    setMode("generating");
    api
      .submitHarmonyAssessment(payload)
      .then(async (res: any) => {
        const immediateReport = res?.data?.report || res?.report;
        if (immediateReport) {
          setReport(immediateReport);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(immediateReport));
          } catch {}
          setMode("report");
          // Optional sync fetch
          try {
            const latest = await api.getMyHarmonyLatest();
            const rep = (latest as any)?.data?.report;
            if (rep) {
              setReport(rep);
              localStorage.setItem(cacheKey, JSON.stringify(rep));
            }
          } catch (e) {
            console.error("Optional getMyHarmonyLatest sync failed:", e);
          }
          return;
        }
        try {
          const latest = await api.getMyHarmonyLatest();
          const rep = (latest as any)?.data?.report;
          if (rep) {
            setReport(rep);
            setMode("report");
            localStorage.setItem(cacheKey, JSON.stringify(rep));
            return;
          }
        } catch {}
        setMode("report");
      })
      .catch((err: any) => {
        console.error("submitHarmonyAssessment error:", err);
        toast({ title: "Submission failed", description: err?.message || "Please try again", variant: "destructive" as any });
        setMode("assessment");
      });
  };

  const loadScoreboard = () => {
    setScoreboardLoading(true);
    api
      .getHarmonyScoreboard()
      .then((res) => {
        setScoreboard((res as any)?.data);
      })
      .catch((err: any) => {
        toast({ title: "Scoreboard error", description: err?.message || "Please try again", variant: "destructive" as any });
      })
      .finally(() => setScoreboardLoading(false));
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Harmony</h2>
          <p className="text-muted-foreground">Team compatibility insights for better collaboration.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4" onValueChange={(v) => v === "scoreboard" && loadScoreboard()}>
          <TabsList>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="scoreboard">Team Scoreboard</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            {mode === "intro" && <HarmonyIntro onGetStarted={startAssessment} hasReport={!!report} onViewReport={() => setMode("report")} />}
            {mode === "assessment" && definition && (
              <HarmonyAssessment
                definition={definition}
                currentIndex={currentIndex}
                answers={answers}
                onSelect={handleSelect}
                onNext={() => setCurrentIndex((i) => Math.min(i + 1, (definition?.assessment?.questions?.length || 1) - 1))}
                onBack={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                onSubmit={handleSubmit}
              />
            )}
            {mode === "generating" && <HarmonyGenerating />}
            {mode === "report" && report && <HarmonyReport report={report} />}
            {mode === "report" && !report && <HarmonyIntro onGetStarted={startAssessment} hasReport={false} onViewReport={() => {}} />}
          </TabsContent>

          <TabsContent value="scoreboard">
            <HarmonyScoreboard data={scoreboard || undefined} loading={scoreboardLoading} onRefresh={loadScoreboard} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Harmony;
