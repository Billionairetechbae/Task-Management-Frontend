import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import {
  normalizePersonalReport,
  parseCachedPersonalSummary,
  isUsableTeamReport,
} from "@/lib/harmonyAiReport";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  getMyHarmonyProfile: vi.fn(),
  getHarmonyAiSummaryMe: vi.fn(),
  getHarmonyAiSummaryTeam: vi.fn(),
  getHarmonyScoreboard: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" }, workspaceRole: "manager" }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/harmony/HarmonyReport", () => ({ default: () => <div>profile-report</div> }));
vi.mock("@/components/harmony/HarmonyScoreboard", () => ({ default: () => <div>scoreboard</div> }));
vi.mock("@/components/harmony/HarmonyIntro", () => ({ default: () => <div>intro</div> }));
vi.mock("@/components/harmony/HarmonyAssessment", () => ({ default: () => <div>assessment</div> }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, api: { ...actual.api, ...mocks } };
});

import Harmony from "@/pages/Harmony";

const profile = { archetype: "Architect", latestSubmissionId: "sub-1", completedAt: "2026-01-01", dimensionScores: {}, dimensionBands: {}, report: {} };
const personal = {
  archetypeMeaning: { name: "Architect", whatItMeans: "You plan carefully.", howItShowsUp: "In reviews.", strengths: [], watchOuts: [] },
  strengths: [{ title: "Rigour", whatItMeans: "Careful work", evidence: "High structure score" }],
  risks: [{ title: "Slow starts", whatItMeans: "Over-planning", evidence: "Low pace", mitigation: "Time-box" }],
  collaborationTips: [{ tip: "Share plans early", why: "Aligns others", example: "Weekly note" }],
  bestWorkConditions: [{ condition: "Clear scope", why: "Reduces rework" }],
  suggestedRoles: [{ role: "Planner", why: "Fits structure" }],
  nextActions: [{ action: "Book a review", why: "Feedback", successSignal: "Notes agreed" }],
};
const CACHE_KEY = "harmony_ai_summary_v2_u1_sub-1";

const renderPage = async () => {
  render(<Harmony />);
  await screen.findByText("Generate AI summary");
};

beforeEach(() => {
  localStorage.clear();
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getMyHarmonyProfile.mockResolvedValue({ data: { profile } });
  mocks.getHarmonyScoreboard.mockResolvedValue({ data: null });
});

describe("normalizePersonalReport", () => {
  it("maps the personal backend contract (not the team one)", () => {
    const out = normalizePersonalReport(personal)!;
    expect(out.executiveSummary).toBe("You plan carefully. In reviews.");
    expect(out.strengths![0]).toContain("Rigour");
    expect(out.watchOuts![0]).toContain("Slow starts");
    expect(out.nextActions![0]).toContain("Book a review");
  });
  it("returns null for blank / team-shaped / malformed input", () => {
    expect(normalizePersonalReport(null)).toBeNull();
    expect(normalizePersonalReport({})).toBeNull();
    expect(normalizePersonalReport({ teamSnapshot: "x", operatingNorms: [] })).toBeNull();
  });
});

describe("cached personal summary", () => {
  it("ignores malformed, empty and old blank entries", () => {
    expect(parseCachedPersonalSummary(null)).toBeNull();
    expect(parseCachedPersonalSummary("{not json")).toBeNull();
    expect(parseCachedPersonalSummary("{}")).toBeNull();
    expect(parseCachedPersonalSummary(JSON.stringify({ strengths: ["a"] }))).toBeNull();
    expect(parseCachedPersonalSummary(JSON.stringify({ executiveSummary: "ok" }))).not.toBeNull();
  });
});

describe("isUsableTeamReport", () => {
  it("needs a team snapshot", () => {
    expect(isUsableTeamReport({ teamSnapshot: "x" })).toBe(true);
    expect(isUsableTeamReport({})).toBe(false);
    expect(isUsableTeamReport(null)).toBe(false);
  });
});

describe("Harmony page AI summaries", () => {
  it("renders a valid personal AI report", async () => {
    mocks.getHarmonyAiSummaryMe.mockResolvedValue({ data: { report: personal, cached: false } });
    await renderPage();
    fireEvent.click(screen.getByText("Generate AI summary"));
    expect(await screen.findByText("You plan carefully. In reviews.")).toBeInTheDocument();
    expect(screen.getByText(/Rigour/)).toBeInTheDocument();
    expect(screen.getByText(/Clear scope/)).toBeInTheDocument();
    expect(localStorage.getItem(CACHE_KEY)).toContain("You plan carefully.");
  });

  it("ignores a stale blank cached summary and does not show a blank card", async () => {
    localStorage.setItem("harmony_ai_summary_u1_sub-1", JSON.stringify({}));
    localStorage.setItem(CACHE_KEY, JSON.stringify({ strengths: ["x"] }));
    await renderPage();
    expect(screen.queryByText("AI summary")).not.toBeInTheDocument();
    expect(screen.getByText("Generate AI summary")).toBeInTheDocument();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("failed request shows an error, no blank card, and caches nothing", async () => {
    mocks.getHarmonyAiSummaryMe.mockRejectedValue(new Error("The Team Harmony AI summary is temporarily unavailable. Please try again shortly."));
    await renderPage();
    fireEvent.click(screen.getByText("Generate AI summary"));
    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
    expect(screen.queryByText("AI summary")).not.toBeInTheDocument();
    expect(screen.getByText("Generate AI summary")).toBeEnabled();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });

  it("a response with an unusable report is treated as a failure, not cached", async () => {
    mocks.getHarmonyAiSummaryMe.mockResolvedValue({ data: { report: { teamSnapshot: "wrong shape" } } });
    await renderPage();
    fireEvent.click(screen.getByText("Generate AI summary"));
    expect(await screen.findByText(/unexpected format/)).toBeInTheDocument();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("renders a valid team AI report and surfaces team errors without a blank card", async () => {
    mocks.getHarmonyAiSummaryTeam.mockResolvedValueOnce({ data: { report: { teamSnapshot: "Team works well together.", strengths: [{ title: "Trust", whatItMeans: "m", evidence: "e" }] } } });
    await renderPage();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Team Harmony" }), { button: 0 });
    fireEvent.click(screen.getByRole("tab", { name: "Team Harmony" }));
    expect(await screen.findByText("Team works well together.")).toBeInTheDocument();

    mocks.getHarmonyAiSummaryTeam.mockRejectedValueOnce(new Error("At least two completed Team Harmony profiles are required to generate a team AI summary."));
    fireEvent.click(screen.getByText("Regenerate"));
    expect(await screen.findByText(/At least two completed/)).toBeInTheDocument();
  });
});
