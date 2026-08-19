import fs from "node:fs";
import path from "node:path";

import AdmZip from "adm-zip";

/**
 * Extract per-person CV text and slides from Dummy Data Generated Resumes.pptx.
 *
 * Matching Excel roster names to PPT slides:
 *  1. Exact name (punctuation/case ignored), e.g. "Kopi, Jia Wei" == "Kopi, Jia Wei "
 *  2. First-token match when one side is just a given/family name, e.g. "Pokka" == "Pokka "
 * If neither matches, the person has no CV / slide (no roster-order fallback).
 */

const SKIP_LABELS = new Set([
  "relevant experience",
  "background",
  "skills",
  "education",
  "period",
  "discipline / university(name & country) / certification",
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

export interface CvSections {
  background: string;
  relevantExperience: string;
  skills: string;
  education: string;
}

export interface ResumeSlide {
  index: number;
  slideNumber: number;
  name: string;
  sections: CvSections;
  cv: string;
}

export function resolvePptxPath(): string | null {
  const configured =
    process.env.DATA_PPTX_PATH || "../Dummy Data Generated Resumes.pptx";
  const filePath = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
  return fs.existsSync(filePath) ? filePath : null;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function namesMatch(excelName: string, pptName: string): boolean {
  const a = normalizeName(excelName);
  const b = normalizeName(pptName);
  if (!a || !b) return false;
  if (a === b) return true;
  const a0 = a.split(" ")[0];
  const b0 = b.split(" ")[0];
  if (a0 && a0 === b0 && (a === a0 || b === b0)) return true;
  return false;
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
  const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const t = decodeXmlText(m[1]);
    if (t) texts.push(t);
  }
  return texts;
}

function slicePptElement(xml: string, start: number): string | null {
  const open = xml.slice(start).match(/^<p:([a-zA-Z]+)/);
  if (!open) return null;
  const name = open[1];
  const openRe = new RegExp(`<p:${name}(?=[\\s>/])`);
  const closeTag = `</p:${name}>`;
  let depth = 0;
  let i = start;
  while (i < xml.length) {
    const nextOpen = xml.slice(i).search(openRe);
    const nextClose = xml.indexOf(closeTag, i);
    if (nextClose < 0) return xml.slice(start);
    const openAt = nextOpen >= 0 ? i + nextOpen : Number.POSITIVE_INFINITY;
    if (openAt < nextClose) {
      depth += 1;
      i = openAt + 3 + name.length;
    } else {
      depth -= 1;
      i = nextClose + closeTag.length;
      if (depth === 0) return xml.slice(start, i);
    }
  }
  return xml.slice(start);
}

function topLevelShapes(slideXml: string): { kind: "group" | "shape" | "table"; xml: string }[] {
  const treeOpen = slideXml.search(/<p:spTree[\s>]/);
  if (treeOpen < 0) return [];
  const tree = slicePptElement(slideXml, treeOpen);
  if (!tree) return [];
  const innerStart = tree.indexOf(">") + 1;
  const inner = tree.slice(innerStart, tree.lastIndexOf("</p:spTree>"));
  const out: { kind: "group" | "shape" | "table"; xml: string }[] = [];
  let i = 0;
  while (i < inner.length) {
    const rest = inner.slice(i);
    const g = rest.search(/<p:grpSp[\s>]/);
    const s = rest.search(/<p:sp[\s>]/);
    const f = rest.search(/<p:graphicFrame[\s>]/);
    const hits = [
      { kind: "group" as const, at: g },
      { kind: "shape" as const, at: s },
      { kind: "table" as const, at: f },
    ].filter((h) => h.at >= 0);
    if (!hits.length) break;
    hits.sort((a, b) => a.at - b.at);
    const hit = hits[0];
    const abs = i + hit.at;
    const chunk = slicePptElement(inner, abs);
    if (!chunk) break;
    if (hit.kind === "table" && chunk.includes("<a:tbl")) {
      out.push({ kind: "table", xml: chunk });
    } else if (hit.kind === "group") {
      out.push({ kind: "group", xml: chunk });
    } else {
      out.push({ kind: "shape", xml: chunk });
    }
    i = abs + chunk.length;
  }
  return out;
}

function parseEducationTable(tableXml: string): string {
  const rows: string[][] = [];
  const trRe = /<a:tr\b[\s\S]*?<\/a:tr>/g;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tableXml))) {
    const cells: string[] = [];
    const tcRe = /<a:tc\b[\s\S]*?<\/a:tc>/g;
    let tc: RegExpExecArray | null;
    while ((tc = tcRe.exec(tr[0]))) {
      const paras: string[] = [];
      const pRe = /<a:p\b[\s\S]*?<\/a:p>/g;
      let p: RegExpExecArray | null;
      while ((p = pRe.exec(tc[0]))) {
        const line = extractTextNodes(p[0]).join(" ").replace(/\s+/g, " ").trim();
        if (line) paras.push(line);
      }
      cells.push(paras.join("\n"));
    }
    if (cells.some((c) => c)) rows.push(cells);
  }
  const body = rows.filter((r, i) => {
    if (i === 0 && r.some((c) => /^period$/i.test(c))) return false;
    return true;
  });
  return body
    .map((r) => {
      const period = r[0] || "";
      const detail = r.slice(1).filter(Boolean).join("\n");
      if (period && detail) return `${period}\n${detail}`;
      return r.filter(Boolean).join("\n");
    })
    .join("\n\n")
    .trim();
}

function groupHeading(texts: string[]): keyof CvSections | null {
  for (const t of texts) {
    const key = sectionKey(t);
    if (key) return key;
  }
  return null;
}

function inferName(cleaned: string[]): string {
  const aiIdx = cleaned.findIndex((t) => /AI and Data/i.test(t));
  if (aiIdx >= 0) {
    for (let i = aiIdx - 1; i >= 0; i--) {
      const t = cleaned[i];
      const low = t.toLowerCase();
      if (TITLE_FRAGMENTS.has(low)) continue;
      if (low.startsWith("email")) continue;
      if (/pokkastan|singapura|malaya|batavia/i.test(t)) continue;
      if (t.length <= 48 && !/[–—]/.test(t) && !/\d{4}-\d{4}/.test(t)) {
        return t.trim();
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

function sectionKey(label: string): keyof CvSections | null {
  const low = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (low === "background") return "background";
  if (low === "relevant experience") return "relevantExperience";
  if (low === "skills" || low === "skills / certifications") return "skills";
  if (low === "education") return "education";
  return null;
}

function parseSections(slideXml: string): { name: string; sections: CvSections } {
  const allTexts = extractTextNodes(slideXml).map((t) =>
    t.replace(/\s+/g, " ").trim(),
  ).filter(Boolean);
  const name = inferName(allTexts);
  const nameKey = normalizeName(name);

  const sections: CvSections = {
    background: "",
    relevantExperience: "",
    skills: "",
    education: "",
  };
  const buckets: Record<keyof CvSections, string[]> = {
    background: [],
    relevantExperience: [],
    skills: [],
    education: [],
  };

  const dropMeta = (t: string) => {
    const low = t.toLowerCase();
    if (sectionKey(t)) return true;
    if (low === "period") return true;
    if (low.startsWith("discipline / university")) return true;
    if (name && normalizeName(t) === nameKey) return true;
    if (TITLE_FRAGMENTS.has(low)) return true;
    if (/AI and Data/i.test(t)) return true;
    if (low.startsWith("email")) return true;
    if (/@sg\.ey\.com/i.test(t)) return true;
    return false;
  };

  for (const shape of topLevelShapes(slideXml)) {
    if (shape.kind === "table") {
      const edu = parseEducationTable(shape.xml);
      if (edu) buckets.education.push(edu);
      continue;
    }
    const texts = extractTextNodes(shape.xml)
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const heading = groupHeading(texts);
    const body = texts.filter((t) => !dropMeta(t));
    if (heading === "skills") {
      buckets.skills.push(...body);
    } else if (heading === "background") {
      buckets.background.push(...body);
    } else if (heading === "relevantExperience") {
      buckets.relevantExperience.push(...body);
    } else if (heading === "education") {
      // Standalone "Education" label; table is a separate shape.
      continue;
    } else if (shape.kind === "group" && body.length) {
      buckets.relevantExperience.push(...body);
    }
  }

  for (const k of Object.keys(buckets) as (keyof CvSections)[]) {
    sections[k] = buckets[k].join("\n").trim();
  }

  return { name, sections };
}

function sectionsToCv(sections: CvSections): string {
  const blocks: string[] = [];
  if (sections.background) {
    blocks.push("Background", sections.background);
  }
  if (sections.relevantExperience) {
    blocks.push("Relevant Experience", sections.relevantExperience);
  }
  if (sections.skills) {
    blocks.push("Skills / Certifications", sections.skills);
  }
  if (sections.education) {
    blocks.push("Education", sections.education);
  }
  return blocks.join("\n");
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
  slides: ResumeSlide[];
  byName: Map<string, ResumeSlide>;
  byIndex: ResumeSlide[];
  mtimeMs: number;
  path: string | null;
} {
  const filePath = resolvePptxPath();
  if (!filePath) {
    return {
      slides: [],
      byName: new Map(),
      byIndex: [],
      mtimeMs: 0,
      path: null,
    };
  }

  const mtimeMs = fs.statSync(filePath).mtimeMs;
  const zip = new AdmZip(filePath);
  const slides: ResumeSlide[] = [];
  const byName = new Map<string, ResumeSlide>();

  listSlideEntries(zip).forEach((entry, index) => {
    const xml = entry.getData().toString("utf8");
    const slideNumber = Number(entry.entryName.match(/slide(\d+)/i)?.[1] ?? index + 1);
    const { name, sections } = parseSections(xml);
    const slide: ResumeSlide = {
      index,
      slideNumber,
      name,
      sections,
      cv: sectionsToCv(sections),
    };
    slides.push(slide);
    if (name) byName.set(normalizeName(name), slide);
  });

  return { slides, byName, byIndex: slides, mtimeMs, path: filePath };
}

export function matchResume(
  excelName: string,
  resumes: { slides: ResumeSlide[]; byName: Map<string, ResumeSlide> },
): ResumeSlide | undefined {
  const key = normalizeName(excelName);
  if (resumes.byName.has(key)) return resumes.byName.get(key);

  const named = resumes.slides.filter((s) => namesMatch(excelName, s.name));
  if (named.length === 1) return named[0];

  const first = key.split(" ")[0];
  const firstHits = resumes.slides.filter((s) => {
    const n = normalizeName(s.name);
    return n === first || n.startsWith(first + " ");
  });
  if (firstHits.length === 1) return firstHits[0];

  return undefined;
}

export function cvForPerson(
  name: string,
  resumes: { slides: ResumeSlide[]; byName: Map<string, ResumeSlide> },
): { cv: string; sections: CvSections; slideNumber: number | null } {
  const slide = matchResume(name, resumes);
  if (!slide) {
    return {
      cv: "",
      sections: {
        background: "",
        relevantExperience: "",
        skills: "",
        education: "",
      },
      slideNumber: null,
    };
  }
  return { cv: slide.cv, sections: slide.sections, slideNumber: slide.slideNumber };
}

export function extractSingleSlidePptx(slideNumber: number): Buffer {
  const filePath = resolvePptxPath();
  if (!filePath) {
    throw new Error("Resume deck not found.");
  }

  const zip = new AdmZip(filePath);
  const slidePath = `ppt/slides/slide${slideNumber}.xml`;
  if (!zip.getEntry(slidePath)) {
    throw new Error(`Slide ${slideNumber} was not found in the resume deck.`);
  }

  const relsEntry = zip.getEntry("ppt/_rels/presentation.xml.rels");
  const presEntry = zip.getEntry("ppt/presentation.xml");
  const typesEntry = zip.getEntry("[Content_Types].xml");
  if (!relsEntry || !presEntry || !typesEntry) {
    throw new Error("Resume deck is missing required PPTX parts.");
  }

  const relsXml = relsEntry.getData().toString("utf8");
  const rels: { id: string; type: string; target: string; extra: string }[] = [];
  const relRe =
    /<Relationship\b([^>]*?)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = relRe.exec(relsXml))) {
    const attrs = m[1];
    const id = /Id="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const type = /Type="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const target = /Target="([^"]+)"/.exec(attrs)?.[1] ?? "";
    rels.push({ id, type, target, extra: attrs });
  }

  const keepSlideRel = rels.find(
    (r) =>
      r.target.replace(/\\/g, "/") === `slides/slide${slideNumber}.xml` ||
      r.target.replace(/\\/g, "/") === `../slides/slide${slideNumber}.xml`,
  );
  if (!keepSlideRel) {
    throw new Error(`Could not find a relationship for slide ${slideNumber}.`);
  }

  const keepRels = rels.filter(
    (r) => !/\/slide$/.test(r.type) || r.id === keepSlideRel.id,
  );
  const newRelsInner = keepRels
    .map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`)
    .join("");
  zip.updateFile(
    "ppt/_rels/presentation.xml.rels",
    Buffer.from(
      relsXml.replace(
        /(<Relationships[^>]*>)[\s\S]*?(<\/Relationships>)/,
        `$1${newRelsInner}$2`,
      ),
      "utf8",
    ),
  );

  const presXml = presEntry.getData().toString("utf8");
  const sldIdMatch = new RegExp(
    `<p:sldId\\b[^>]*r:id="${keepSlideRel.id}"[^>]*/>`,
  ).exec(presXml);
  const keepSldId = sldIdMatch
    ? sldIdMatch[0]
    : `<p:sldId id="256" r:id="${keepSlideRel.id}"/>`;
  zip.updateFile(
    "ppt/presentation.xml",
    Buffer.from(
      presXml.replace(
        /<p:sldIdLst[^>]*>[\s\S]*?<\/p:sldIdLst>/,
        `<p:sldIdLst>${keepSldId}</p:sldIdLst>`,
      ),
      "utf8",
    ),
  );

  for (const entry of [...zip.getEntries()]) {
    const name = entry.entryName.replace(/\\/g, "/");
    const slideFile = name.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    const slideRels = name.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/i);
    const notes = name.match(/^ppt\/notesSlides\/notesSlide(\d+)\./i);
    const n = Number(slideFile?.[1] || slideRels?.[1] || notes?.[1] || 0);
    if (n && n !== slideNumber) {
      zip.deleteFile(entry.entryName);
    }
  }

  const typesXml = typesEntry.getData().toString("utf8");
  const filteredTypes = typesXml.replace(
    /<Override\b[^>]*PartName="\/ppt\/(slides|notesSlides)\/[^"]+"[^>]*\/>/g,
    (tag) => {
      if (tag.includes(`/ppt/slides/slide${slideNumber}.xml`)) return tag;
      if (tag.includes(`/ppt/notesSlides/notesSlide${slideNumber}.`)) return tag;
      if (/\/ppt\/slides\/slide\d+\.xml/.test(tag)) return "";
      if (/\/ppt\/notesSlides\/notesSlide\d+/.test(tag)) return "";
      return tag;
    },
  );
  zip.updateFile("[Content_Types].xml", Buffer.from(filteredTypes, "utf8"));

  return zip.toBuffer();
}

export function emptySections(): CvSections {
  return {
    background: "",
    relevantExperience: "",
    skills: "",
    education: "",
  };
}
