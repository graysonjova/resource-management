import type { Consultant } from "./types";

export const MAX_SKILLS_PER_PERSON = 10;
export const TOP_SKILLS_FILTER_COUNT = 10;

/**
 * Primary Skillset (Platform) is a comma-separated tool list
 * (e.g. "Python, MySQL, C++, Javascript, Typescript").
 * Legacy generator format "Category (tool, tool)" is also supported.
 */
export function parsePrimarySkills(raw: unknown): string[] {
  let text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const paren = text.match(/^.+?\((.+)\)\s*$/);
  if (paren) text = paren[1].trim();

  const seen = new Set<string>();
  const skills: string[] = [];
  for (const part of text.split(",")) {
    const skill = part.trim();
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
    if (skills.length >= MAX_SKILLS_PER_PERSON) break;
  }
  return skills;
}

/** Top N skills across the roster by how many people list them. */
export function topSkills(
  consultants: Consultant[],
  n = TOP_SKILLS_FILTER_COUNT,
): string[] {
  const counts = new Map<string, number>();
  for (const c of consultants) {
    for (const skill of c.skills ?? []) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([name]) => name);
}
