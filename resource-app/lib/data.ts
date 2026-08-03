import fs from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import type { Consultant, WeeklyPoint } from "./types";

/**
 * Reference "current week" the forecast columns start from. The demo dataset's
 * weekly columns begin at WC 7 Jul 2026, so we anchor all availability/roll-off
 * maths to that date for internal consistency.
 */
export const REFERENCE_DATE = new Date("2026-07-06T00:00:00Z");

export const SKILLSET_CATEGORIES = [
  "Data Engineering",
  "AI / GenAI",
  "MLOps",
  "Data Governance",
];

const WEEK_COLUMNS = [
  "WC 7 Jul 2026",
  "WC 14 Jul 2026",
  "WC 22 Jul 2026",
  "WC 29 Jul 2026",
  "WC 5 Aug 2026",
  "WC 12 Aug 2026",
  "WC 19 Aug 2026",
];

function resolveDataPath(): string {
  const configured = process.env.DATA_XLSX_PATH || "../Dummy Data Generated.xlsx";
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace("%", "").trim();
    const n = parseFloat(cleaned);
    if (!Number.isNaN(n)) return cleaned.includes("%") ? n / 100 : n;
  }
  return 0;
}

function toISO(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    // Excel serial date fallback.
    const d = XLSX.SSF ? new Date(Math.round((value - 25569) * 86400 * 1000)) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

function shortWeekLabel(col: string): string {
  // "WC 7 Jul 2026" -> "7 Jul"
  const m = col.replace(/^WC\s+/, "").match(/^(\d+\s+\w+)/);
  return m ? m[1] : col;
}

function parseSkillset(raw: string): { category: string; tools: string } {
  const text = (raw || "").trim();
  const idx = text.indexOf(" (");
  if (idx === -1) return { category: text, tools: "" };
  const category = text.slice(0, idx).trim();
  const tools = text.slice(idx + 2).replace(/\)\s*$/, "").trim();
  return { category, tools };
}

function slugify(name: string, index: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "person"}-${index}`;
}

function splitRank(rankAndGrade: string): { rank: string; grade: string } {
  const text = (rankAndGrade || "").trim();
  const m = text.match(/^(.*?)\s*(\d+)?$/);
  if (!m) return { rank: text, grade: "" };
  return { rank: (m[1] || text).trim(), grade: m[2] || "" };
}

interface Cache {
  mtimeMs: number;
  consultants: Consultant[];
}
let cache: Cache | null = null;

function normalizeRow(row: Record<string, unknown>, index: number): Consultant {
  const name = String(row["Employee name"] ?? "").trim();
  const rankAndGrade = String(row["Rank and Grade"] ?? "").trim();
  const { rank, grade } = splitRank(rankAndGrade);
  const { category, tools } = parseSkillset(String(row["Primary Skillset (Platform)"] ?? ""));

  const weekly: WeeklyPoint[] = WEEK_COLUMNS.map((col) => {
    const allocation = toNumber(row[col]);
    return {
      week: col,
      label: shortWeekLabel(col),
      allocation,
      available: Math.max(0, 1 - allocation),
    };
  });

  const currentAllocation = toNumber(row["Current Week Forecast"]);

  const known = new Set([
    "Employee name",
    "Rank and Grade",
    "Gender",
    "Nationality",
    "Bench Category Column",
    "6 Weeks Forecast",
    "12 Weeks Forecast",
    "Current Week Forecast",
    ...WEEK_COLUMNS,
    "Allocation",
    "% availability for next 6 months",
    "End date",
    "Primary Skillset (Platform)",
    "Secondary Skillset",
    "Previous/Existing Project Roles",
    "Aspiring roles",
    "Experience Summary (CV)",
    "Current Engagement",
    "EM",
  ]);
  const extra: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    if (!known.has(key) && row[key] != null && String(row[key]).trim()) {
      extra[key] = String(row[key]).trim();
    }
  }

  return {
    id: slugify(name, index),
    name,
    rank,
    grade,
    rankAndGrade,
    gender: String(row["Gender"] ?? "").trim(),
    nationality: String(row["Nationality"] ?? "").trim(),
    benchCategory: String(row["Bench Category Column"] ?? "").trim(),
    currentAllocation,
    availableNow: Math.max(0, 1 - currentAllocation),
    availabilityNext6m: toNumber(row["% availability for next 6 months"]),
    forecast6w: toNumber(row["6 Weeks Forecast"]),
    forecast12w: toNumber(row["12 Weeks Forecast"]),
    weekly,
    allocationText: String(row["Allocation"] ?? "").trim(),
    endDate: toISO(row["End date"]),
    skillsetCategory: category,
    skillsetTools: tools,
    secondarySkill: String(row["Secondary Skillset"] ?? "").trim(),
    previousRoles: String(row["Previous/Existing Project Roles"] ?? "").trim(),
    aspiringRoles: String(row["Aspiring roles"] ?? "").trim(),
    experienceCV: String(row["Experience Summary (CV)"] ?? "").trim(),
    currentEngagement: String(row["Current Engagement"] ?? "").trim(),
    em: String(row["EM"] ?? "").trim(),
    extra,
  };
}

export function getConsultants(): Consultant[] {
  const filePath = resolveDataPath();
  let mtimeMs = 0;
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    throw new Error(
      `Could not find the data workbook at "${filePath}". Set DATA_XLSX_PATH in .env.local.`,
    );
  }

  if (cache && cache.mtimeMs === mtimeMs) return cache.consultants;

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  const consultants = rows
    .filter((r) => String(r["Employee name"] ?? "").trim())
    .map((r, i) => normalizeRow(r, i));

  cache = { mtimeMs, consultants };
  return consultants;
}

export function getConsultantById(id: string): Consultant | undefined {
  return getConsultants().find((c) => c.id === id);
}
