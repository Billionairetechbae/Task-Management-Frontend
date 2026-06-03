// src/pages/Harmony.tsx
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HarmonyIntro from "@/components/harmony/HarmonyIntro";
import HarmonyAssessment from "@/components/harmony/HarmonyAssessment";
import HarmonyGenerating from "@/components/harmony/HarmonyGenerating";
import HarmonyReport from "@/components/harmony/HarmonyReport";
import HarmonyScoreboard from "@/components/harmony/HarmonyScoreboard";
import {
  api,
  HarmonyAssessmentDefinition,
  HarmonyProfile,
  HarmonyScoreboardData,
  HarmonyAiReport,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ContentCard, SectionHeader } from "@/components/dashboard/DashboardComponents";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Mode = "intro" | "assessment" | "generating" | "report";

type HarmonyAiSummary = {
  executiveSummary?: string;
  strengths?: string[];
  watchOuts?: string[];
  collaborationTips?: string[];
  suggestedRoles?: string[];
  nextActions?: string[];
};

const safeJsonParse = (raw: any): HarmonyAiSummary => {
  if (!raw) return {};
  if (typeof raw === "object") return raw as HarmonyAiSummary;

  const text = String(raw);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed as HarmonyAiSummary;
  } catch {
    // ignore
  }
  return { executiveSummary: text };
};

const Harmony = () => {
  const { toast } = useToast();
  const { user, workspaceRole } = useAuth();

  const [mode, setMode] = useState<Mode>("intro");
  const [definition, setDefinition] = useState<HarmonyAssessmentDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [profile, setProfile] = useState<HarmonyProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [scoreboard, setScoreboard] = useState<HarmonyScoreboardData | null>(null);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);

  // --- AI summary state
  const [aiSummary, setAiSummary] = useState<HarmonyAiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // --- Team AI summary state
  const [teamAiReport, setTeamAiReport] = useState<HarmonyAiReport | null>(null);
  const [teamAiLoading, setTeamAiLoading] = useState(false);
  const [teamAiError, setTeamAiError] = useState<string | null>(null);

  const cacheKey = useMemo(() => {
    const uid = user?.id;
    return uid ? `harmony_global_profile_user_${uid}` : "harmony_global_profile_user_fallback";
  }, [user?.id]);

  // AI cache key: tie to the latest profile version so we don’t regenerate unnecessarily
  const aiCacheKey = useMemo(() => {
    const uid = user?.id;
    const version =
      (profile as any)?.latestSubmissionId ||
      profile?.completedAt ||
      profile?.archetype ||
      "v1";
    return uid ? `harmony_ai_summary_${uid}_${version}` : "harmony_ai_summary_fallback";
  }, [user?.id, (profile as any)?.latestSubmissionId, profile?.completedAt, profile?.archetype]);

  const loadMyProfile = async () => {
    try {
      setProfileLoading(true);

      // prefill from cache
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

  // When profile changes, try load AI summary from cache (no API call)
  useEffect(() => {
    if (!profile || !user?.id) {
      setAiSummary(null);
      return;
    }
    const cached = localStorage.getItem(aiCacheKey);
    if (cached) {
      try {
        setAiSummary(JSON.parse(cached));
      } catch {
        setAiSummary(null);
      }
    } else {
      setAiSummary(null);
    }
  }, [aiCacheKey, profile, user?.id]);

  useEffect(() => {
    loadMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Reload team AI summary when active workspace changes
  useEffect(() => {
    const handleWorkspaceSwitch = () => {
      setTeamAiReport(null);
      setTeamAiError(null);
    };

    window.addEventListener("workspace:switch", handleWorkspaceSwitch);
    return () => window.removeEventListener("workspace:switch", handleWorkspaceSwitch);
  }, []);

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

      // Clear AI summary cache for old version (new profile = new key)
      setAiSummary(null);

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

  const loadTeamAiReport = async (force = false) => {
    try {
      setTeamAiLoading(true);
      setTeamAiError(null);
      const res = await api.getHarmonyAiSummaryTeam(force);
      setTeamAiReport(res?.data?.report || null);
    } catch (err: any) {
      const msg = err?.message || "Failed to load team AI summary";
      setTeamAiError(msg);
      toast({
        title: "Team AI summary error",
        description: msg,
        variant: "destructive" as any,
      });
    } finally {
      setTeamAiLoading(false);
    }
  };

  const canManageTeamAi = ["owner", "admin", "manager"].includes(workspaceRole || "");

  const clearAiSummary = () => {
    localStorage.removeItem(aiCacheKey);
    setAiSummary(null);
    toast({
      title: "Harmony",
      description: "AI summary cleared.",
    });
  };

  const generateAiSummary = async (force = false) => {
    try {
      if (!profile || !user?.id) return;

      if (!force) {
        const cached = localStorage.getItem(aiCacheKey);
        if (cached) {
          try {
            setAiSummary(JSON.parse(cached));
            return;
          } catch {
            // ignore and regenerate
          }
        }
      }

      setAiLoading(true);

      const res = await api.getHarmonyAiSummaryMe(force);
      const raw = res?.data?.report;

      // For backward compatibility, map the new report shape to old summary shape
      const parsed: HarmonyAiSummary = raw
        ? {
            executiveSummary: raw.teamSnapshot,
            strengths: raw.strengths,
            watchOuts: raw.risks,
            collaborationTips: raw.operatingNorms,
            nextActions: raw.actionsNext30Days,
          }
        : {};

      setAiSummary(parsed);
      localStorage.setItem(aiCacheKey, JSON.stringify(parsed));

      toast({
        title: "Harmony",
        description: "AI summary generated.",
      });
    } catch (err: any) {
      toast({
        title: "Harmony",
        description: err?.message || "Failed to generate AI summary.",
        variant: "destructive" as any,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const totalQuestions = definition?.questions?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-fuchsia-500/5 p-6 shadow-sm">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shadow-lg shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-primary-foreground">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3a9 9 0 0 0 0 18M3 12h18" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Work Style Intelligence</p>
                <h2 className="text-3xl font-bold tracking-tight">Harmony</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Understand your natural work style and compare team collaboration patterns across the active workspace.
                </p>
              </div>
            </div>

            {profile?.archetype && (
              <div className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Your archetype</p>
                <p className="mt-0.5 text-lg font-bold bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                  {profile.archetype}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => generateAiSummary(false)} disabled={aiLoading || mode !== "report"} className="hover-scale">
                    {aiLoading ? "Generating…" : aiSummary ? "Refresh AI summary" : "Generate AI summary"}
                  </Button>
                  {aiSummary && (
                    <Button size="sm" variant="ghost" onClick={clearAiSummary} disabled={aiLoading}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <Tabs
          defaultValue="profile"
          className="space-y-4"
          onValueChange={(value) => {
            if (value === "scoreboard") {
              loadScoreboard();
              loadTeamAiReport(false);
            }
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
              <>
                <HarmonyReport profile={profile} onRetake={startAssessment} />

                {/* AI summary render */}
                {aiSummary?.executiveSummary && (
                  <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">AI summary</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateAiSummary(true)}
                          disabled={aiLoading}
                        >
                          {aiLoading ? "Generating…" : "Regenerate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearAiSummary}
                          disabled={aiLoading}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{aiSummary.executiveSummary}</p>

                    {!!aiSummary.strengths?.length && (
                      <div>
                        <p className="text-sm font-medium">Strengths</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          {aiSummary.strengths.map((x, i) => (
                            <li key={`strength-${i}`}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!aiSummary.watchOuts?.length && (
                      <div>
                        <p className="text-sm font-medium">Watch-outs</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          {aiSummary.watchOuts.map((x, i) => (
                            <li key={`watch-${i}`}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!aiSummary.collaborationTips?.length && (
                      <div>
                        <p className="text-sm font-medium">Collaboration tips</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          {aiSummary.collaborationTips.map((x, i) => (
                            <li key={`tip-${i}`}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!aiSummary.suggestedRoles?.length && (
                      <div>
                        <p className="text-sm font-medium">Suggested roles</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          {aiSummary.suggestedRoles.map((x, i) => (
                            <li key={`role-${i}`}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!!aiSummary.nextActions?.length && (
                      <div>
                        <p className="text-sm font-medium">Next actions</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          {aiSummary.nextActions.map((x, i) => (
                            <li key={`action-${i}`}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!profileLoading && mode === "report" && !profile && (
              <HarmonyIntro hasProfile={false} onGetStarted={startAssessment} onViewProfile={() => {}} />
            )}
          </TabsContent>

          <TabsContent value="scoreboard" className="space-y-4">
            {/* Team AI Summary */}
            <ContentCard>
              <SectionHeader
                title="Team AI Summary"
                actions={
                  <div className="flex items-center gap-2">
                    {!teamAiReport ? (
                      <Button
                        onClick={() => loadTeamAiReport(true)}
                        disabled={teamAiLoading || !canManageTeamAi}
                      >
                        {teamAiLoading ? "Generating…" : "Generate team AI summary"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => loadTeamAiReport(true)}
                          disabled={teamAiLoading || !canManageTeamAi}
                        >
                          {teamAiLoading ? "Generating…" : "Regenerate"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => loadTeamAiReport(false)}
                          disabled={teamAiLoading}
                        >
                          Refresh
                        </Button>
                      </>
                    )}
                  </div>
                }
              />

              {!canManageTeamAi && (
                <p className="text-xs text-muted-foreground mb-4">
                  Only owners/admins/managers can generate; everyone can view once generated.
                </p>
              )}

              {teamAiError && (
                <p className="text-sm text-destructive mb-4">{teamAiError}</p>
              )}

              {teamAiLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading team AI summary...
                </div>
              ) : !teamAiReport ? (
                <div className="py-8 text-center text-muted-foreground">
                  No team AI summary yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Helper function */}
                  {(() => {
                    const safe = (v: any) => (typeof v === "string" ? { text: v } : v);
                    const arr = (v: any) => (Array.isArray(v) ? v : []);
                    const str = (v: any) => (v ? String(v) : "");

                    return (
                      <>
                        {/* Team Snapshot */}
                        {teamAiReport.teamSnapshot && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Team Snapshot</h4>
                            <p className="text-sm text-muted-foreground">{str(teamAiReport.teamSnapshot)}</p>
                          </div>
                        )}

                        {/* Team Makeup */}
                        {arr(teamAiReport.teamMakeup).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-3">Team Makeup</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Archetype</TableHead>
                                  <TableHead>Count</TableHead>
                                  <TableHead>What it means</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {arr(teamAiReport.teamMakeup).map((item: any, i: number) => {
                                  const s = safe(item);
                                  return (
                                    <TableRow key={`makeup-${i}`}>
                                      <TableCell className="font-medium">{s.archetype || s.text || ""}</TableCell>
                                      <TableCell>{s.count || ""}</TableCell>
                                      <TableCell className="text-muted-foreground">{s.whatItMeans || s.whatItMeansInThisTeam || ""}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Strengths */}
                        {arr(teamAiReport.strengths).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Strengths</h4>
                            <ul className="space-y-3">
                              {arr(teamAiReport.strengths).map((item: any, i: number) => {
                                const s = safe(item);
                                return (
                                  <li key={`strength-${i}`} className="border rounded-lg p-3">
                                    <p className="font-medium text-sm">{s.title || s.text || ""}</p>
                                    {s.whatItMeans && <p className="text-xs text-muted-foreground mt-1">{s.whatItMeans}</p>}
                                    {s.evidence && <p className="text-xs text-muted-foreground mt-1">Evidence: {s.evidence}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Risks */}
                        {arr(teamAiReport.risks).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Risks</h4>
                            <ul className="space-y-3">
                              {arr(teamAiReport.risks).map((item: any, i: number) => {
                                const s = safe(item);
                                return (
                                  <li key={`risk-${i}`} className="border rounded-lg p-3">
                                    <p className="font-medium text-sm">{s.title || s.text || ""}</p>
                                    {s.whatItMeans && <p className="text-xs text-muted-foreground mt-1">{s.whatItMeans}</p>}
                                    {s.evidence && <p className="text-xs text-muted-foreground mt-1">Evidence: {s.evidence}</p>}
                                    {s.mitigation && <p className="text-xs text-muted-foreground mt-1">Mitigation: {s.mitigation}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Best Pairings */}
                        {arr(teamAiReport.bestPairings).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Best Pairings</h4>
                            <ul className="space-y-3">
                              {arr(teamAiReport.bestPairings).map((item: any, i: number) => {
                                const s = safe(item);
                                return (
                                  <li key={`best-${i}`} className="border rounded-lg p-3">
                                    <p className="font-medium text-sm">{s.pairing || s.text || ""}</p>
                                    {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                                    {s.whyItWorks && <p className="text-xs text-muted-foreground mt-1">Why it works: {s.whyItWorks}</p>}
                                    {s.idealWork && <p className="text-xs text-muted-foreground mt-1">Ideal work: {s.idealWork}</p>}
                                    {s.evidence && <p className="text-xs text-muted-foreground mt-1">Evidence: {s.evidence}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Watch Out Pairings */}
                        {arr(teamAiReport.watchOutPairings).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Watch Out Pairings</h4>
                            <ul className="space-y-3">
                              {arr(teamAiReport.watchOutPairings).map((item: any, i: number) => {
                                const s = safe(item);
                                return (
                                  <li key={`watch-${i}`} className="border rounded-lg p-3">
                                    <p className="font-medium text-sm">{s.pairing || s.text || ""}</p>
                                    {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                                    {s.whyItGetsMessy && <p className="text-xs text-muted-foreground mt-1">Why it gets messy: {s.whyItGetsMessy}</p>}
                                    {s.mitigation && <p className="text-xs text-muted-foreground mt-1">Mitigation: {s.mitigation}</p>}
                                    {s.evidence && <p className="text-xs text-muted-foreground mt-1">Evidence: {s.evidence}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Operating Norms */}
                        {arr(teamAiReport.operatingNorms).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Operating Norms</h4>
                            <ul className="space-y-3">
                              {arr(teamAiReport.operatingNorms).map((item: any, i: number) => {
                                const s = safe(item);
                                return (
                                  <li key={`norm-${i}`} className="border rounded-lg p-3">
                                    <p className="font-medium text-sm">{s.norm || s.text || ""}</p>
                                    {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                                    {s.howToImplement && <p className="text-xs text-muted-foreground mt-1">How to implement: {s.howToImplement}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Actions Next 30 Days */}
                        {arr(teamAiReport.actionsNext30Days).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Actions Next 30 Days</h4>
                            <ul className="space-y-3">
                              {arr(teamAiReport.actionsNext30Days).map((item: any, i: number) => {
                                const s = safe(item);
                                return (
                                  <li key={`action-${i}`} className="border rounded-lg p-3">
                                    <p className="font-medium text-sm">{s.action || s.text || ""}</p>
                                    {s.why && <p className="text-xs text-muted-foreground mt-1">{s.why}</p>}
                                    {s.ownerSuggestion && <p className="text-xs text-muted-foreground mt-1">Owner suggestion: {s.ownerSuggestion}</p>}
                                    {s.successSignal && <p className="text-xs text-muted-foreground mt-1">Success signal: {s.successSignal}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Archetype Primer */}
                        {teamAiReport.archetypePrimer && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Archetype Primer</h4>
                            <div className="border rounded-lg p-3">
                              {teamAiReport.archetypePrimer.name && (
                                <p className="font-medium text-sm">{teamAiReport.archetypePrimer.name}</p>
                              )}
                              {teamAiReport.archetypePrimer.whatItMeans && (
                                <p className="text-xs text-muted-foreground mt-1">{teamAiReport.archetypePrimer.whatItMeans}</p>
                              )}
                              {teamAiReport.archetypePrimer.howItShowsUp && (
                                <p className="text-xs text-muted-foreground mt-1">How it shows up: {teamAiReport.archetypePrimer.howItShowsUp}</p>
                              )}
                              {arr(teamAiReport.archetypePrimer.strengths).length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-foreground">Strengths:</p>
                                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                    {arr(teamAiReport.archetypePrimer.strengths).map((s: any, i: number) => (
                                      <li key={`primer-strength-${i}`}>{typeof s === "string" ? s : s.text || s.title || ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {arr(teamAiReport.archetypePrimer.watchOuts).length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-foreground">Watch outs:</p>
                                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                    {arr(teamAiReport.archetypePrimer.watchOuts).map((w: any, i: number) => (
                                      <li key={`primer-watchout-${i}`}>{typeof w === "string" ? w : w.text || w.title || ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {arr(teamAiReport.archetypePrimer.bestWith).length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-foreground">Best with:</p>
                                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                    {arr(teamAiReport.archetypePrimer.bestWith).map((b: any, i: number) => (
                                      <li key={`primer-bestwith-${i}`}>{typeof b === "string" ? b : b.text || b.title || ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {arr(teamAiReport.archetypePrimer.watchWith).length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-foreground">Watch with:</p>
                                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                    {arr(teamAiReport.archetypePrimer.watchWith).map((w: any, i: number) => (
                                      <li key={`primer-watchwith-${i}`}>{typeof w === "string" ? w : w.text || w.title || ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </ContentCard>

            {/* Harmony Scoreboard */}
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