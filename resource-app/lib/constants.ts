/** Today's date at UTC midnight, used for live availability calculations. */
export function currentDateUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

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
