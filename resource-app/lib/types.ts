export type SkillsetCategory = string;

export interface WeeklyPoint {
  /** Full column label, e.g. "WC 7 Jul 2026". */
  week: string;
  /** Short label for axes, e.g. "7 Jul". */
  label: string;
  /** Allocation fraction 0..1 for that week. */
  allocation: number;
  /** Free capacity 0..1 (1 - allocation). */
  available: number;
}

export interface Consultant {
  id: string;
  name: string;
  rank: string; // base rank, e.g. "Associate"
  grade: string; // e.g. "2" or ""
  rankAndGrade: string; // e.g. "Associate 2"
  gender: string;
  nationality: string;
  benchCategory: string;
  currentAllocation: number; // 0..1 this week
  availableNow: number; // 0..1 spare capacity this week
  availabilityNext6m: number; // 0..1
  forecast6w: number;
  forecast12w: number;
  weekly: WeeklyPoint[];
  allocationText: string;
  endDate: string | null; // ISO date
  /** First skill from Primary Skillset (display / primary chip). */
  skillsetCategory: SkillsetCategory;
  /**
   * Skills parsed from Primary Skillset (Platform), split on comma,
   * capped at 10 per person.
   */
  skills: string[];
  /** @deprecated Prefer `skills`; kept as alias of the same list. */
  skillBuckets: string[];
  /** Primary Skillset joined back as a comma-separated string (max 10). */
  skillsetTools: string;
  secondarySkill: string;
  previousRoles: string;
  aspiringRoles: string;
  experienceCV: string;
  currentEngagement: string;
  em: string;
  extra: Record<string, string>;
}

export interface Booking {
  id: string;
  consultantId: string;
  consultantName: string;
  engagement: string;
  em: string;
  startDate: string; // ISO
  endDate: string; // ISO
  allocationPct: number; // 0..100
  note?: string;
  createdAt: string;
}

export interface ConflictResult {
  ok: boolean;
  committedPct: number; // already committed during overlap (0..100)
  requestedPct: number;
  message: string;
}
