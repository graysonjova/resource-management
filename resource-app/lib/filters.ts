import {
  isOnBench,
  isPartiallyOnBench,
  weeksUntil,
} from "./availability";
import type { Consultant } from "./types";

export interface Filters {
  rank?: string;
  gender?: string;
  nationality?: string;
  skillset?: string;
  availability?: "all" | "bench" | "spare" | "within" | "full";
  withinWeeks?: number;
  minFreePct?: number;
  q?: string;
}

function rankMatches(consultantRank: string, filterRank: string): boolean {
  if (consultantRank === filterRank) return true;
  // "Intern" filter should also match "Intern (CS)"
  const base = consultantRank.split(/\s*\(/)[0].trim();
  return base === filterRank;
}

function skillMatches(c: Consultant, skillset: string): boolean {
  const wanted = skillset.trim().toLowerCase();
  if (!wanted) return true;
  if ((c.skills ?? []).some((s) => s.toLowerCase() === wanted)) return true;
  if (c.skillsetCategory.toLowerCase() === wanted) return true;
  // Fallback: substring match inside the raw tools string
  if (c.skillsetTools.toLowerCase().split(",").some((s) => s.trim() === wanted)) {
    return true;
  }
  return false;
}

export function applyFilters(list: Consultant[], f: Filters): Consultant[] {
  return list.filter((c) => {
    if (f.rank && !rankMatches(c.rank, f.rank)) return false;
    if (f.gender && c.gender !== f.gender) return false;
    if (f.nationality) {
      const wanted = f.nationality === "Citizen" ? "Singaporean" : f.nationality;
      if (c.nationality !== wanted && c.nationality !== f.nationality) return false;
    }
    if (f.skillset && !skillMatches(c, f.skillset)) return false;

    if (f.availability === "bench" && !isOnBench(c)) return false;
    if (f.availability === "spare" && !isPartiallyOnBench(c)) return false;
    if (f.availability === "full") {
      const w = weeksUntil(c.endDate);
      const rollingOffSoon = w != null && w >= 0 && w <= 6;
      if (c.currentAllocation < 1 || rollingOffSoon) return false;
    }
    if (f.availability === "within") {
      const within = f.withinWeeks ?? 6;
      const w = weeksUntil(c.endDate);
      const soon = w != null && w >= 0 && w <= within;
      // Rolling off means still allocated, with an engagement end date
      // inside the window. People already fully on bench are excluded.
      if (!soon || c.currentAllocation === 0) return false;
    }

    if (f.minFreePct != null && c.availableNow * 100 < f.minFreePct) return false;

    if (f.q) {
      const q = f.q.toLowerCase();
      const hay = [
        c.name,
        c.skillsetCategory,
        ...(c.skills ?? []),
        c.skillsetTools,
        c.secondarySkill,
        c.previousRoles,
        c.aspiringRoles,
        c.experienceCV,
        c.currentEngagement,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filtersFromParams(sp: URLSearchParams): Filters {
  const num = (v: string | null) => (v == null ? undefined : Number(v));
  return {
    rank: sp.get("rank") || undefined,
    gender: sp.get("gender") || undefined,
    nationality: sp.get("nationality") || undefined,
    skillset: sp.get("skillset") || undefined,
    availability: (sp.get("availability") as Filters["availability"]) || "all",
    withinWeeks: num(sp.get("withinWeeks")),
    minFreePct: num(sp.get("minFreePct")),
    q: sp.get("q") || undefined,
  };
}
