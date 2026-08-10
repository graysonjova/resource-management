/**
 * Reference "current week" for availability / roll-off maths. Aligned to the
 * first weekly column in Dummy Data Generated.xlsx (WC 14 Jul 2026).
 */
export const REFERENCE_DATE = new Date("2026-07-13T00:00:00Z");

/** Skill bucket columns in the Master sheet (Yes / blank). */
export const SKILL_BUCKETS = [
  "Data Engineering",
  "Data Architecture",
  "Business Intelligence & Analytics",
  "Artificial Intelligence (AI) & Machine Learning",
  "Data Governance & Quality",
  "Data Security & Privacy",
  "Data Strategy & Management",
  "Cloud Data Platforms & Operations",
] as const;

export const SKILLSET_CATEGORIES = [...SKILL_BUCKETS];
