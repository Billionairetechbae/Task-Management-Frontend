// View models for Harmony AI summaries. The personal and team reports have different backend
// contracts (see harmonyAiController), so each gets its own normalizer. Never run a personal
// report through the team mapping.

export type HarmonyAiSummary = {
  executiveSummary?: string;
  strengths?: string[];
  watchOuts?: string[];
  collaborationTips?: string[];
  bestWorkConditions?: string[];
  suggestedRoles?: string[];
  nextActions?: string[];
};

const asText = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// Items arrive as plain strings or as structured objects ({title, whatItMeans, evidence, ...}).
const itemText = (item: unknown): string => {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  const o = item as Record<string, unknown>;
  const head = asText(o.title) || asText(o.tip) || asText(o.condition) || asText(o.role) || asText(o.action);
  const body = asText(o.whatItMeans) || asText(o.why);
  const extra = asText(o.evidence) || asText(o.mitigation) || asText(o.example) || asText(o.successSignal);
  return [head && body ? `${head}: ${body}` : head || body, extra].filter(Boolean).join(" — ");
};

const itemList = (v: unknown): string[] => (Array.isArray(v) ? v.map(itemText).filter(Boolean) : []);

/** Maps the PERSONAL backend report to the display model. Returns null if it has no usable content. */
export const normalizePersonalReport = (raw: unknown): HarmonyAiSummary | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  const meaning = r.archetypeMeaning;
  const executiveSummary =
    typeof meaning === "string"
      ? asText(meaning)
      : [asText(meaning?.whatItMeans), asText(meaning?.howItShowsUp)].filter(Boolean).join(" ");
  if (!executiveSummary) return null;
  return {
    executiveSummary,
    strengths: itemList(r.strengths),
    watchOuts: itemList(r.risks),
    collaborationTips: itemList(r.collaborationTips),
    bestWorkConditions: itemList(r.bestWorkConditions),
    suggestedRoles: itemList(r.suggestedRoles),
    nextActions: itemList(r.nextActions),
  };
};

/** True only for a cached/derived personal summary that has the minimum expected content. */
export const isUsablePersonalSummary = (v: unknown): v is HarmonyAiSummary =>
  !!v && typeof v === "object" && !!asText((v as HarmonyAiSummary).executiveSummary);

/** Parses a localStorage entry; malformed, empty or old-shape entries are ignored (returns null). */
export const parseCachedPersonalSummary = (raw: string | null): HarmonyAiSummary | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isUsablePersonalSummary(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Team reports are rendered from their native contract; this only guards against blank cards. */
export const isUsableTeamReport = (v: unknown): boolean =>
  !!v && typeof v === "object" && !!asText((v as Record<string, unknown>).teamSnapshot);
