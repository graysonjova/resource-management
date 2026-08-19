import { REFERENCE_DATE } from "./constants";
import type { Consultant } from "./types";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Whole-week difference between the reference date and an ISO date. */
export function weeksUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - REFERENCE_DATE.getTime()) / MS_PER_WEEK);
}

/** True if the consultant has any spare capacity within `withinWeeks`. */
export function isAvailableWithin(c: Consultant, withinWeeks: number): boolean {
  if (c.availableNow > 0) return true;
  const w = weeksUntil(c.endDate);
  return w != null && w <= withinWeeks;
}
