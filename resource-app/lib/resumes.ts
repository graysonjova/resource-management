import fs from "node:fs";
import path from "node:path";

import AdmZip from "adm-zip";

/**
 * Extract per-person CV text from Dummy Data Generated Resumes.pptx.
 * Slides are generated in the same order as the Master roster, so index
 * matching is primary; name matching is a fallback.
 */

const SKIP_LABELS = new Set([
  "relevant experience",
  "background",
  "skills",
  "education",
  "period",
  "discipline / university(name & country) / certification",
]);

const TITLE_FRAGMENTS = new Set([
  "senior",
  "manager",
  "consultant",
  "intern",
  "associate",
  "senior consultant",
  "senior manager",
]);

function resolvePptxPath(): string | null {
  const configured =
    process.env.DATA_PPTX_PATH || "../Dummy Data Generated Resumes.pptx";
  const filePath = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
  return fs.existsSync(filePath) ? filePath : null;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeXmlText(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x0?b;/gi, "\n")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\r/g, "")
    .replace(/\u000b/g, "\n")
    .trim();
}

function extractTextNodes(xml: string): string[] {
  const texts: string[] = [];
  // Only plain text nodes — avoid runaway matches across broken nested markup
  // left behind by slide cloning.
  const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const t = decodeXmlText(m[1]);
    if (t) texts.push(t);
  }
  return texts;
}

function inferName(cleaned: string[]): string {
  // Title line in the template contains "AI and Data"; name sits just above it
  // (may be split across runs like "Senior" / "Manager" / ", AI and Data...").
  const aiIdx = cleaned.findIndex((t) => /AI and Data/i.test(t));
  if (aiIdx >= 0) {
    for (let i = aiIdx - 1; i >= 0; i--) {
      const t = cleaned[i];
      const low = t.toLowerCase();
      if (TITLE_FRAGMENTS.has(low)) continue;
      if (low.startsWith("email")) continue;
      if (/pokkastan|singapura|malaya|batavia/i.test(t)) continue;
      if (t.length <= 48 && !/[–—]/.test(t) && !/\d{4}-\d{4}/.test(t)) {
        return t;
      }
    }
  }

  const email = cleaned.find((t) => /@sg\.ey\.com/i.test(t));
  if (email) {
    const local = email.replace(/^email:\s*/i, "").split("@")[0]?.trim();
    if (local) return local;
  }
  return "";
}

function slideToCv(texts: string[]): { name: string; cv: string } {
  const cleaned = texts.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  const name = inferName(cleaned);
  const nameKey = normalizeName(name);

  const body: string[] = [];
  for (const t of cleaned) {
    const low = t.toLowerCase();
    if (SKIP_LABELS.has(low)) {
      if (low === "background") body.push("Background");
      else if (low === "relevant experience") body.push("Relevant Experience");
      else if (low === "skills") body.push("Skills / Certifications");
      else if (low === "education") body.push("Education");
      continue;
    }
    if (name && normalizeName(t) === nameKey) continue;
    if (TITLE_FRAGMENTS.has(low)) continue;
    if (/AI and Data/i.test(t)) continue;
    if (low.startsWith("email")) continue;
    if (/@sg\.ey\.com/i.test(t)) continue;
    body.push(t);
  }

  return { name, cv: body.join("\n") };
}

function listSlideEntries(zip: AdmZip): AdmZip.IZipEntry[] {
  return zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const na = Number(a.entryName.match(/slide(\d+)/i)?.[1] ?? 0);
      const nb = Number(b.entryName.match(/slide(\d+)/i)?.[1] ?? 0);
      return na - nb;
    });
}

export function loadResumeMap(): {
  byName: Map<string, string>;
  byIndex: string[];
  mtimeMs: number;
  path: string | null;
} {
  const filePath = resolvePptxPath();
  if (!filePath) {
    return { byName: new Map(), byIndex: [], mtimeMs: 0, path: null };
  }

  const mtimeMs = fs.statSync(filePath).mtimeMs;
  const zip = new AdmZip(filePath);
  const byName = new Map<string, string>();
  const byIndex: string[] = [];

  for (const entry of listSlideEntries(zip)) {
    const xml = entry.getData().toString("utf8");
    const { name, cv } = slideToCv(extractTextNodes(xml));
    byIndex.push(cv);
    if (name) byName.set(normalizeName(name), cv);
  }

  return { byName, byIndex, mtimeMs, path: filePath };
}

export function cvForPerson(
  name: string,
  index: number,
  resumes: { byName: Map<string, string>; byIndex: string[] },
): string {
  // Roster and resume deck are generated in the same order.
  if (resumes.byIndex[index]) return resumes.byIndex[index];

  const key = normalizeName(name);
  if (resumes.byName.has(key)) return resumes.byName.get(key) || "";
  const first = key.split(" ")[0];
  for (const [k, v] of resumes.byName) {
    if (k === first || k.startsWith(first + " ") || first.startsWith(k)) return v;
  }
  return "";
}
