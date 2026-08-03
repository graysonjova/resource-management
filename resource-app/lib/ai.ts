import type { Consultant } from "./types";

export const RANK_FAMILIES = ["Intern", "Associate", "Senior", "Manager"] as const;
export type RankFamily = (typeof RANK_FAMILIES)[number];

export function rankFamily(rank: string): RankFamily | null {
  const r = (rank || "").toLowerCase();
  if (r.includes("intern")) return "Intern";
  if (r.includes("associate")) return "Associate";
  if (r.includes("senior")) return "Senior";
  if (r.includes("manager")) return "Manager";
  return null;
}

export function nextRank(family: RankFamily): RankFamily | null {
  const i = RANK_FAMILIES.indexOf(family);
  return i >= 0 && i < RANK_FAMILIES.length - 1 ? RANK_FAMILIES[i + 1] : null;
}

/** Compact projection of a consultant for LLM prompts (keeps token usage low). */
export function compactConsultant(c: Consultant) {
  return {
    name: c.name,
    rank: c.rankAndGrade,
    skillset: c.skillsetCategory,
    tools: c.skillsetTools,
    secondary: c.secondarySkill,
    nationality: c.nationality,
    freeNowPct: Math.round(c.availableNow * 100),
    free6mPct: Math.round(c.availabilityNext6m * 100),
    endDate: c.endDate,
    currentEngagement: c.currentEngagement,
    previousRoles: c.previousRoles,
    aspiring: c.aspiringRoles,
    experience: c.experienceCV.replace(/\s+/g, " ").slice(0, 300),
  };
}
