import fs from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import {
  REFERENCE_DATE,
  SKILL_BUCKETS,
  SKILLSET_CATEGORIES,
} from "./constants";
import { cvForPerson, loadResumeMap } from "./resumes";
import { parseCombinedBuckets, parsePrimarySkills, topSkills } from "./skills";
import type { Consultant, WeeklyPoint } from "./types";

export { REFERENCE_DATE, SKILL_BUCKETS, SKILLSET_CATEGORIES };
export { parseCombinedBuckets, parsePrimarySkills, topSkills };

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
    if (!cleaned) return 0;
    const n = parseFloat(cleaned);
    if (!Number.isNaN(n)) {
      // "50%" -> 0.5; bare "50" from a percent cell already serialised as 50 stays 50
      // only when explicitly marked with %. Excel fractions arrive as numbers.
      return cleaned.includes("%") ? n / 100 : n;
    }
  }
  return 0;
}

function toISO(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const d = XLSX.SSF
      ? new Date(Math.round((value - 25569) * 86400 * 1000))
      : null;
    return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

function shortWeekLabel(col: string): string {
  const m = col.replace(/^WC\s+/i, "").match(/^(\d+\s+\w+)/);
  return m ? m[1] : col;
}

function discoverWeekColumns(headers: string[]): string[] {
  return headers.filter((h) => /^WC\s+/i.test(h));
}

function isYes(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === "yes" || s === "y" || s === "true" || s === "1";
}

function bucketsFromRow(row: Record<string, unknown>): string[] {
  return SKILL_BUCKETS.filter((b) => isYes(row[b]));
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
  // "Intern (CS) 1", "Associate 2", "Manager 1"
  const m = text.match(/^(.*?)(?:\s+(\d+))?$/);
  if (!m) return { rank: text, grade: "" };
  return { rank: (m[1] || text).trim(), grade: m[2] || "" };
}

function firstPresent(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") return row[k];
  }
  return null;
}

interface Cache {
  xlsxMtimeMs: number;
  pptxMtimeMs: number;
  consultants: Consultant[];
}
let cache: Cache | null = null;

function normalizeRow(
  row: Record<string, unknown>,
  index: number,
  weekColumns: string[],
  experienceCV: string,
  cvSections: Consultant["cvSections"],
  resumeSlideNumber: number | null,
): Consultant {
  const name = String(row["Employee name"] ?? "").trim();
  const rankAndGrade = String(row["Rank and Grade"] ?? "").trim();
  const { rank, grade } = splitRank(rankAndGrade);

  const bucketsFromYes = bucketsFromRow(row);
  const fromCombined = parseCombinedBuckets(row["Combined Bucket Skillset"]);
  const skills = fromCombined.length ? fromCombined : bucketsFromYes;
  const skillsetCategory = skills[0] || "";
  const skillsetTools = parsePrimarySkills(row["Primary Skillset (Platform)"]).join(
    ", ",
  );

  const weekly: WeeklyPoint[] = weekColumns.map((col) => {
    const allocation = toNumber(row[col]);
    return {
      week: col,
      label: shortWeekLabel(col),
      allocation,
      available: Math.max(0, 1 - allocation),
    };
  });

  const currentAllocation = toNumber(row["Current Week Forecast"]);

  const availabilityNext6m = toNumber(
    firstPresent(row, [
      "% Availablity (6mth)", // real workbook spelling
      "% Availability (6mth)",
      "% availability for next 6 months", // legacy generator
    ]),
  );

  const allocationText = String(
    firstPresent(row, ["Allocation Remarks", "Allocation"]) ?? "",
  ).trim();

  const excelCv = String(
    firstPresent(row, ["Experience Summary (CV)"]) ?? "",
  ).trim();

  const known = new Set([
    "Employee name",
    "Rank and Grade",
    "Gender",
    "Nationality",
    "Bench Category Column",
    "6 Weeks Forecast",
    "12 Weeks Forecast",
    "Current Week Forecast",
    ...weekColumns,
    "Allocation",
    "Allocation Remarks",
    "Bench/Partial Bench (Profinda)",
    "% Availablity (1mth)",
    "% Availablity (2mth)",
    "% Availablity (3mth)",
    "% Availablity (6mth)",
    "% Availability (6mth)",
    "% Availablity 6mth onwards (Outdated)",
    "% availability for next 6 months",
    "End date",
    "Primary Skillset (Platform)",
    "Secondary Skillset",
    "Combined Bucket Skillset",
    ...SKILL_BUCKETS,
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
  if (skills.length) {
    extra["Skill buckets"] = skills.join(", ");
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
    availableNow: Math.max(0, 1 - Math.min(currentAllocation, 1)),
    availabilityNext6m,
    forecast6w: toNumber(row["6 Weeks Forecast"]),
    forecast12w: toNumber(row["12 Weeks Forecast"]),
    weekly,
    allocationText,
    endDate: toISO(row["End date"]),
    skillsetCategory,
    skills,
    skillBuckets: skills,
    skillsetTools,
    secondarySkill: String(row["Secondary Skillset"] ?? "")
      .replace(/\r\n/g, "\n")
      .trim(),
    previousRoles: String(row["Previous/Existing Project Roles"] ?? "").trim(),
    aspiringRoles: String(row["Aspiring roles"] ?? "").trim(),
    experienceCV: experienceCV || excelCv,
    cvSections,
    resumeSlideNumber,
    currentEngagement: String(row["Current Engagement"] ?? "").trim(),
    em: String(row["EM"] ?? "").trim(),
    extra,
  };
}

export function getConsultants(): Consultant[] {
  const filePath = resolveDataPath();
  let xlsxMtimeMs = 0;
  try {
    xlsxMtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    throw new Error(
      `Could not find the data workbook at "${filePath}". Set DATA_XLSX_PATH in .env.local.`,
    );
  }

  const resumes = loadResumeMap();
  if (
    cache &&
    cache.xlsxMtimeMs === xlsxMtimeMs &&
    cache.pptxMtimeMs === resumes.mtimeMs
  ) {
    return cache.consultants;
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames.includes("Master")
    ? "Master"
    : wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const headerRow =
    (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })[0] as
      | unknown[]
      | undefined) || [];
  const headers = headerRow.map((h) => String(h ?? "").trim()).filter(Boolean);
  const weeks = discoverWeekColumns(headers);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  const consultants = rows
    .filter((r) => String(r["Employee name"] ?? "").trim())
    .map((r, i) => {
      const name = String(r["Employee name"] ?? "").trim();
      const matched = cvForPerson(name, resumes);
      return normalizeRow(
        r,
        i,
        weeks,
        matched.cv,
        matched.sections,
        matched.slideNumber,
      );
    });

  cache = {
    xlsxMtimeMs,
    pptxMtimeMs: resumes.mtimeMs,
    consultants,
  };
  return consultants;
}

export function getConsultantById(id: string): Consultant | undefined {
  return getConsultants().find((c) => c.id === id);
}
