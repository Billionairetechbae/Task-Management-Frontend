import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HarmonyIntro from "@/components/harmony/HarmonyIntro";
import HarmonyAssessment from "@/components/harmony/HarmonyAssessment";
import HarmonyGenerating from "@/components/harmony/HarmonyGenerating";
import HarmonyReport from "@/components/harmony/HarmonyReport";
import HarmonyScoreboard from "@/components/harmony/HarmonyScoreboard";
import { api, HarmonyAssessmentDefinition, HarmonyProfile, HarmonyScoreboardData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "intro" | "assessment" | "generating" | "report";

const Harmony = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>("intro");
  const [definition, setDefinition] = useState<HarmonyAssessmentDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [profile, setProfile] = useState<HarmonyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [scoreboard, setScoreboard] = useState<HarmonyScoreboardData | null>(null);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);

  const cacheKey = useMemo(() => {
    const uid = user?.id;
    return uid ? `harmony_global_profile_user_${uid}` : "harmony_global_profile_user_fallback";
  }, [user?.id]);

  const loadMyProfile = async () => {
    try {
      setProfileLoading(true);

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.archetype) {
          setProfile(parsed);
          setMode("report");
        }
      }

      const res = await api.getMyHarmonyProfile();
      const latestProfile = res?.data?.profile || null;

      if (latestProfile) {
        setProfile(latestProfile);
        setMode("report");
        localStorage.setItem(cacheKey, JSON.stringify(latestProfile));
      } else {
        setProfile(null);
        setMode("intro");
        localStorage.removeItem(cacheKey);
      }
    } catch (err: any) {
      const msg = err?.message || "Unable to load your Harmony profile.";
      toast({
        title: "Harmony",
        description: msg,
        variant: "destructive" as any,
      });
      setMode("intro");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const startAssessment = async () => {
    try {
      const res = await api.getHarmonyAssessment();
      const assessment = res?.data?.assessment;

      if (!assessment?.questions?.length) {
        throw new Error("Assessment questions are not available.");
      }

      setDefinition(assessment);
      setAnswers({});
      setCurrentIndex(0);
      setMode("assessment");
    } catch (err: any) {
      toast({
        title: "Failed to load assessment",
        description: err?.message || "Please try again.",
        variant: "destructive" as any,
      });
    }
  };

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    try {
      const questions = definition?.questions || [];

      const unanswered = questions.filter((q) => q.required && !answers[q.id]);

      if (unanswered.length > 0) {
        toast({
          title: "Incomplete assessment",
          description: "Please answer all questions before submitting.",
          variant: "destructive" as any,
        });
        return;
      }

      const payload = questions.map((q) => ({
        questionId: q.id,
        optionId: answers[q.id],
      }));

      setMode("generating");

      const res = await api.submitHarmonyAssessment(payload);
      const updatedProfile = res?.data?.profile;

      if (!updatedProfile) {
        throw new Error("Assessment submitted, but no profile was returned.");
      }

      setProfile(updatedProfile);
      localStorage.setItem(cacheKey, JSON.stringify(updatedProfile));
      setMode("report");

      toast({
        title: "Harmony profile updated",
        description: "Your latest work style profile has been saved.",
      });
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err?.message || "Please try again.",
        variant: "destructive" as any,
      });
      setMode("assessment");
    }
  };

  const loadScoreboard = async () => {
    try {
      setScoreboardLoading(true);
      const res = await api.getHarmonyScoreboard();
      setScoreboard(res?.data || null);
    } catch (err: any) {
      toast({
        title: "Scoreboard error",
        description: err?.message || "Please select a workspace and try again.",
        variant: "destructive" as any,
      });
    } finally {
      setScoreboardLoading(false);
    }
  };

  const totalQuestions = definition?.questions?.length || 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Harmony</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Understand your natural work style and compare team collaboration patterns across the active workspace.
              </p>
            </div>

            {profile?.archetype && (
              <div className="rounded-xl border bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Your current archetype</p>
                <p className="text-lg font-semibold">{profile.archetype}</p>
              </div>
            )}
          </div>
        </div>

        <Tabs
          defaultValue="profile"
          className="space-y-4"
          onValueChange={(value) => {
            if (value === "scoreboard") loadScoreboard();
          }}
        >
          <TabsList>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="scoreboard">Team Harmony</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            {profileLoading && (
              <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                Loading your Harmony profile...
              </div>
            )}

            {!profileLoading && mode === "intro" && (
              <HarmonyIntro
                hasProfile={!!profile}
                onGetStarted={startAssessment}
                onViewProfile={() => setMode("report")}
              />
            )}

            {!profileLoading && mode === "assessment" && definition && (
              <HarmonyAssessment
                definition={definition}
                currentIndex={currentIndex}
                answers={answers}
                onSelect={handleSelect}
                onNext={() => setCurrentIndex((i) => Math.min(i + 1, totalQuestions - 1))}
                onBack={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                onSubmit={handleSubmit}
              />
            )}

            {!profileLoading && mode === "generating" && <HarmonyGenerating />}

            {!profileLoading && mode === "report" && profile && (
              <HarmonyReport
                profile={profile}
                onRetake={startAssessment}
              />
            )}

            {!profileLoading && mode === "report" && !profile && (
              <HarmonyIntro
                hasProfile={false}
                onGetStarted={startAssessment}
                onViewProfile={() => {}}
              />
            )}
          </TabsContent>

          <TabsContent value="scoreboard">
            <HarmonyScoreboard
              data={scoreboard || undefined}
              loading={scoreboardLoading}
              onRefresh={loadScoreboard}
              onTakeAssessment={startAssessment}
              currentUserHasProfile={!!profile}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Harmony;