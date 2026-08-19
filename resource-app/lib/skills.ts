import type { Consultant } from "./types";

export const MAX_SKILLS_PER_PERSON = 10;
export const TOP_SKILLS_FILTER_COUNT = 10;

function looksLikeFormula(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  if (!text) return true;
  if (text.startsWith("=")) return true;
  if (/TEXTJOIN|FILTER|_xlfn/i.test(text)) return true;
  return false;
}

/** Split a comma-separated skill / bucket list, cap at 10, skip blanks/dupes. */
export function parseCommaList(raw: unknown, max = MAX_SKILLS_PER_PERSON): string[] {
  let text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of text.split(",")) {
    const item = part.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= max) break;
  }
  return items;
}

/**
 * Combined Bucket Skillset is a comma-separated list of practice buckets
 * (e.g. "Data Engineering, Artificial Intelligence (AI) & Machine Learning").
 * The workbook column is often an Excel formula — callers should fall back to
 * the Yes/blank bucket columns when this returns empty.
 */
export function parseCombinedBuckets(raw: unknown): string[] {
  if (looksLikeFormula(raw)) return [];
  return parseCommaList(raw);
}

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

  return parseCommaList(text);
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
