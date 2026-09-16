import fs from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import {
  currentDateUtc,
  SKILL_BUCKETS,
  SKILLSET_CATEGORIES,
} from "./constants";
import { cvForPerson, loadResumeMap } from "./resumes";
import { parseCombinedBuckets, parsePrimarySkills, topSkills } from "./skills";
import type { Consultant, WeeklyPoint } from "./types";

export { currentDateUtc, SKILL_BUCKETS, SKILLSET_CATEGORIES };
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
  const dateParts = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (value instanceof Date) {
    return dateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF?.parse_date_code(value);
    return parsed ? dateParts(parsed.y, parsed.m, parsed.d) : null;
  }
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const d = new Date(text);
    return Number.isNaN(d.getTime())
      ? null
      : dateParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  return null;
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

interface UtilizationRecord {
  project: string;
  engagementManager: string;
  startDate: string | null;
  endDate: string | null;
  utilization: number;
}

function normalizedName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addUtcMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function activeOn(record: UtilizationRecord, date: Date): boolean {
  const day = isoDate(date);
  return (
    (!record.startDate || record.startDate <= day) &&
    (!record.endDate || record.endDate >= day)
  );
}

function allocationOn(records: UtilizationRecord[], date: Date): number {
  return records
    .filter((record) => activeOn(record, date))
    .reduce((sum, record) => sum + record.utilization, 0);
}

function utilizationByResource(
  workbook: XLSX.WorkBook,
): Map<string, UtilizationRecord[]> {
  const sheet = workbook.Sheets["Utilization by Engagement"];
  if (!sheet) {
    throw new Error(
      'Workbook is missing the required "Utilization by Engagement" sheet.',
    );
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });
  const byResource = new Map<string, UtilizationRecord[]>();
  let project = "";
  let engagementManager = "";

  for (const row of rows) {
    const rowProject = String(row["Project"] ?? "").trim();
    const rowManager = String(row["Engagement Manager"] ?? "").trim();
    if (rowProject && !/^unique resources count:/i.test(rowProject)) {
      project = rowProject;
    }
    if (rowManager) engagementManager = rowManager;

    const resource = String(row["Resource"] ?? "").trim();
    if (!resource) continue;
    const key = normalizedName(resource);
    const records = byResource.get(key) ?? [];
    records.push({
      project,
      engagementManager,
      startDate: toISO(row["Start Date"]),
      endDate: toISO(row["End Date"]),
      utilization: Math.max(0, toNumber(row["Utilization %"])),
    });
    byResource.set(key, records);
  }

  return byResource;
}

function weeklyFromUtilization(
  records: UtilizationRecord[],
  today: Date,
): WeeklyPoint[] {
  const monday = addUtcDays(today, -((today.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addUtcDays(monday, index * 7);
    const allocation = allocationOn(records, date);
    const label = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    return {
      week: `WC ${label} ${date.getUTCFullYear()}`,
      label,
      allocation,
      available: Math.max(0, 1 - Math.min(allocation, 1)),
    };
  });
}

interface Cache {
  xlsxMtimeMs: number;
  pptxMtimeMs: number;
  asOfDate: string;
  consultants: Consultant[];
}
let cache: Cache | null = null;

function normalizeRow(
  row: Record<string, unknown>,
  index: number,
  weekColumns: string[],
  utilizationRecords: UtilizationRecord[],
  today: Date,
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

  const activeRecords = utilizationRecords.filter((record) =>
    activeOn(record, today),
  );
  const currentAllocation = allocationOn(utilizationRecords, today);
  const forecast6w = allocationOn(utilizationRecords, addUtcDays(today, 42));
  const forecast12w = allocationOn(utilizationRecords, addUtcDays(today, 84));
  const allocationAt6m = allocationOn(
    utilizationRecords,
    addUtcMonths(today, 6),
  );
  const weekly = weeklyFromUtilization(utilizationRecords, today);
  const activeProjects = [
    ...new Set(activeRecords.map((record) => record.project).filter(Boolean)),
  ];
  const activeManagers = [
    ...new Set(
      activeRecords
        .map((record) => record.engagementManager)
        .filter(Boolean),
    ),
  ];
  const endDate = activeRecords.some((record) => !record.endDate)
    ? null
    : activeRecords
        .map((record) => record.endDate)
        .filter((date): date is string => Boolean(date))
        .sort()
        .at(-1) ?? null;
  const allocationText = activeRecords.length
    ? activeRecords
        .map(
          (record) =>
            `${record.project || "Engagement"} ${Math.round(
              record.utilization * 100,
            )}%`,
        )
        .join("\n")
    : "On bench - no active utilization engagement";
  const benchCategory =
    currentAllocation === 0
      ? "On bench now"
      : currentAllocation < 1
        ? "Partially on bench"
        : "Fully allocated";

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
    benchCategory,
    currentAllocation,
    availableNow: Math.max(0, 1 - Math.min(currentAllocation, 1)),
    availabilityNext6m: Math.max(0, 1 - Math.min(allocationAt6m, 1)),
    forecast6w,
    forecast12w,
    weekly,
    allocationText,
    endDate,
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
    currentEngagement: activeProjects.join(", ") || "On bench",
    em: activeManagers.join(", "),
    extra,
  };
}

export function getConsultants(): Consultant[] {
  const filePath = resolveDataPath();
  const today = currentDateUtc();
  const asOfDate = isoDate(today);
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
    cache.pptxMtimeMs === resumes.mtimeMs &&
    cache.asOfDate === asOfDate
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
  const utilization = utilizationByResource(wb);

  const consultants = rows
    .filter((r) => String(r["Employee name"] ?? "").trim())
    .map((r, i) => {
      const name = String(r["Employee name"] ?? "").trim();
      const matched = cvForPerson(name, resumes);
      const utilizationRecords = utilization.get(normalizedName(name)) ?? [];
      return normalizeRow(
        r,
        i,
        weeks,
        utilizationRecords,
        today,
        matched.cv,
        matched.sections,
        matched.slideNumber,
      );
    });

  cache = {
    xlsxMtimeMs,
    pptxMtimeMs: resumes.mtimeMs,
    asOfDate,
    consultants,
  };
  return consultants;
}

export function getConsultantById(id: string): Consultant | undefined {
  return getConsultants().find((c) => c.id === id);
}
