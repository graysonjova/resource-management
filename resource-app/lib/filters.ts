import type { Consultant } from "./types";

export interface Filters {
  rank?: string;
  gender?: string;
  nationality?: string;
  skillset?: string;
  availability?: "all" | "bench" | "spare" | "within";
  withinWeeks?: number;
  minFreePct?: number;
  q?: string;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const REF = new Date("2026-07-06T00:00:00Z");

function weeksUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - REF.getTime()) / MS_PER_WEEK);
}

export function applyFilters(list: Consultant[], f: Filters): Consultant[] {
  return list.filter((c) => {
    if (f.rank && c.rank !== f.rank) return false;
    if (f.gender && c.gender !== f.gender) return false;
    if (f.nationality && c.nationality !== f.nationality) return false;
    if (f.skillset && c.skillsetCategory !== f.skillset) return false;

    if (f.availability === "bench" && c.currentAllocation !== 0) return false;
    if (f.availability === "spare" && c.availableNow <= 0) return false;
    if (f.availability === "within") {
      const within = f.withinWeeks ?? 6;
      const w = weeksUntil(c.endDate);
      const soon = w != null && w <= within;
      if (!(c.availableNow > 0 || soon)) return false;
    }

    if (f.minFreePct != null && c.availableNow * 100 < f.minFreePct) return false;

    if (f.q) {
      const q = f.q.toLowerCase();
      const hay = [
        c.name,
        c.skillsetCategory,
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
