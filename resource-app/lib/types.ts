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
  /** First Combined Bucket Skillset entry (display / primary chip). */
  skillsetCategory: SkillsetCategory;
  /**
   * Practice buckets from Combined Bucket Skillset (comma-split),
   * falling back to the Yes/blank bucket columns. Capped at 10.
   */
  skills: string[];
  /** Same as `skills` (Combined Bucket list). */
  skillBuckets: string[];
  /** Tools from Primary Skillset (Platform), comma-separated. */
  skillsetTools: string;
  secondarySkill: string;
  previousRoles: string;
  aspiringRoles: string;
  experienceCV: string;
  cvSections: {
    background: string;
    relevantExperience: string;
    skills: string;
    education: string;
  };
  resumeSlideNumber: number | null;
  currentEngagement: string;
  em: string;
  extra: Record<string, string>;
}
