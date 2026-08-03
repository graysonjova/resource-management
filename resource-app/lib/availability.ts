import { REFERENCE_DATE } from "./data";
import type { Booking, ConflictResult, Consultant } from "./types";

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

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Conflict check for a proposed booking. Coarse but demo-accurate: it sums the
 * consultant's baseline engagement load (until their end date) plus any existing
 * bookings that overlap the requested window, and compares against 100%.
 */
export function checkConflict(
  consultant: Consultant,
  existing: Booking[],
  requested: { startDate: string; endDate: string; allocationPct: number },
): ConflictResult {
  const reqStart = new Date(requested.startDate + "T00:00:00Z");
  const reqEnd = new Date(requested.endDate + "T00:00:00Z");

  let committed = 0;

  // Baseline: still on their current engagement until end date.
  if (consultant.endDate) {
    const baseEnd = new Date(consultant.endDate + "T00:00:00Z");
    if (
      consultant.currentAllocation > 0 &&
      rangesOverlap(REFERENCE_DATE, baseEnd, reqStart, reqEnd)
    ) {
      committed += consultant.currentAllocation * 100;
    }
  } else if (consultant.currentAllocation > 0) {
    // Allocated with no end date -> treat as ongoing.
    committed += consultant.currentAllocation * 100;
  }

  // Existing bookings that overlap the requested window.
  for (const b of existing) {
    if (b.consultantId !== consultant.id) continue;
    const bStart = new Date(b.startDate + "T00:00:00Z");
    const bEnd = new Date(b.endDate + "T00:00:00Z");
    if (rangesOverlap(bStart, bEnd, reqStart, reqEnd)) {
      committed += b.allocationPct;
    }
  }

  committed = Math.round(committed);
  const free = Math.max(0, 100 - committed);
  const ok = requested.allocationPct <= free;

  return {
    ok,
    committedPct: committed,
    requestedPct: requested.allocationPct,
    message: ok
      ? `Available: ${free}% free during this window.`
      : `Conflict: only ${free}% free during this window, but ${requested.allocationPct}% requested (${committed}% already committed).`,
  };
}
