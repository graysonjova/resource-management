import { NextResponse } from "next/server";

import { isAvailableWithin } from "@/lib/availability";
import { getConsultants } from "@/lib/data";
import { chat, extractJson } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AiRec {
  name: string;
  role?: string;
  fitScore: number;
  reasoning: string;
}

interface Rec {
  consultantId: string;
  name: string;
  rank: string;
  skillset: string;
  freeNowPct: number;
  endDate: string | null;
  role: string;
  fitScore: number;
  reasoning: string;
}

const RANK_FAMILIES = ["Intern", "Associate", "Senior", "Manager"] as const;
type RankFamily = (typeof RANK_FAMILIES)[number];

function rankFamily(rank: string): RankFamily | null {
  const r = (rank || "").toLowerCase();
  if (r.includes("intern")) return "Intern";
  if (r.includes("associate")) return "Associate";
  if (r.includes("senior")) return "Senior";
  if (r.includes("manager")) return "Manager";
  return null;
}

const NUM_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** Detect an explicit rank composition like "2 seniors and 3 associates". */
function parseComposition(text: string): Partial<Record<RankFamily, number>> {
  const desired: Partial<Record<RankFamily, number>> = {};
  const re =
    /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(intern|associate|senior|manager)s?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = /^\d+$/.test(m[1])
      ? parseInt(m[1], 10)
      : NUM_WORDS[m[1].toLowerCase()] ?? 0;
    const fam = (m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()) as RankFamily;
    if (n > 0) desired[fam] = (desired[fam] ?? 0) + n;
  }
  return desired;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
  }

  const {
    brief = "",
    engagement = "",
    skillset = "",
    requiredSkills = "",
    startDate = "",
    endDate = "",
    allocationPct = 50,
    context = "",
    withinWeeks = 26,
  } = body;

  if (!String(brief).trim() && !String(engagement).trim()) {
    return NextResponse.json(
      { message: "Describe the engagement or team you need." },
      { status: 400 },
    );
  }

  const all = getConsultants();
  const candidates = all.filter((c) => isAvailableWithin(c, Number(withinWeeks)));

  if (candidates.length === 0) {
    return NextResponse.json({
      recommendations: [],
      candidateCount: 0,
      note: "No resources have spare capacity in this window.",
    });
  }

  const compact = candidates.map((c) => ({
    name: c.name,
    rank: c.rankAndGrade,
    skillset: c.skillsetCategory,
    tools: c.skillsetTools,
    secondary: c.secondarySkill,
    nationality: c.nationality,
    freeNowPct: Math.round(c.availableNow * 100),
    free6mPct: Math.round(c.availabilityNext6m * 100),
    endDate: c.endDate,
    experience: c.experienceCV.replace(/\s+/g, " ").slice(0, 320),
  }));

  const system =
    "You are a staffing assistant for a data & AI consulting firm. " +
    "Recommend consultants for an engagement, choosing ONLY from the provided candidate list.\n" +
    "RANK FAMILIES (ignore the trailing grade number): Intern < Associate (Associate 1/2/3) < " +
    "Senior (Senior 1/2) < Manager (Manager 1/2). These are DISTINCT levels.\n" +
    "COMPOSITION RULES (critical):\n" +
    "- If the brief specifies counts/ranks (e.g. '2 seniors and 3 associates'), return EXACTLY that " +
    "composition using ONLY candidates whose rank family matches. '2 seniors' = 2 people in the Senior " +
    "family; '3 associates' = 3 people in the Associate family.\n" +
    "- NEVER substitute a different rank family to fill a slot. A Manager is NOT a Senior. An Intern is " +
    "NOT an Associate. A Senior is NOT an Associate.\n" +
    "- If not enough available candidates of a requested family exist, fill as many as you can with the " +
    "correct family and leave the rest UNFILLED - do NOT backfill with another rank. State in the summary " +
    "which slots could not be filled and why.\n" +
    "- If the brief gives no count, recommend the single best fit (1 person) unless a team is clearly implied.\n" +
    "- Recommend at most 8 people.\n" +
    "For EACH pick you MUST provide: 'name' (exactly as given), 'role' (the slot, e.g. 'Senior RAG lead'), " +
    "'fitScore' (integer 0-100), and 'reasoning' (1-2 sentences that MUST cite the specific skills/tools, " +
    "relevant past projects, and availability that justify THIS person for THIS slot - never leave it empty).\n" +
    'Return STRICT JSON object: {"summary": string, "picks": [ {"name","role","fitScore","reasoning"} ] }. ' +
    "No prose outside the JSON.";

  const user = JSON.stringify({
    brief,
    engagement,
    requiredSkillset: skillset,
    requiredSkills,
    window: { startDate, endDate, allocationPct },
    context,
    candidates: compact,
  });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      {
        temperature: 0,
        jsonMode: true,
        maxTokens: 2000,
        reasoning: { enabled: false },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error).message },
      { status: 502 },
    );
  }

  const parsed = extractJson<{ summary?: string; picks?: AiRec[] } | AiRec[]>(
    content,
  );
  const recsRaw: AiRec[] = Array.isArray(parsed)
    ? parsed
    : (parsed?.picks ?? (parsed as any)?.recommendations ?? []);
  const summary = Array.isArray(parsed) ? "" : String(parsed?.summary ?? "");

  const byName = new Map(all.map((c) => [c.name.toLowerCase(), c]));
  const seen = new Set<string>();
  const modelRecs: Rec[] = recsRaw
    .map((r): Rec | null => {
      const c = byName.get(String(r.name).toLowerCase());
      if (!c || seen.has(c.id)) return null;
      seen.add(c.id);
      return {
        consultantId: c.id,
        name: c.name,
        rank: c.rankAndGrade,
        skillset: c.skillsetCategory,
        freeNowPct: Math.round(c.availableNow * 100),
        endDate: c.endDate,
        role: String(r.role ?? ""),
        fitScore: Math.max(0, Math.min(100, Math.round(Number(r.fitScore) || 0))),
        reasoning: String(r.reasoning ?? ""),
      };
    })
    .filter((r): r is Rec => r !== null);

  // Hard-enforce an explicit rank composition so a Manager can never fill a
  // "Senior" slot, an Intern can never fill an "Associate" slot, etc.
  const desired = parseComposition(`${brief} ${engagement}`);
  const shortfalls: string[] = [];
  let recommendations: Rec[];

  if (Object.keys(desired).length > 0) {
    const chosen: Rec[] = [];
    const usedIds = new Set<string>();

    for (const fam of Object.keys(desired) as RankFamily[]) {
      const count = desired[fam] ?? 0;

      // Prefer the model's picks that actually belong to this rank family.
      const fromModel = modelRecs
        .filter((r) => rankFamily(r.rank) === fam && !usedIds.has(r.consultantId))
        .sort((a, b) => b.fitScore - a.fitScore)
        .slice(0, count);
      fromModel.forEach((r) => {
        chosen.push(r);
        usedIds.add(r.consultantId);
      });

      // Backfill remaining slots ONLY with correct-family available candidates.
      let need = count - fromModel.length;
      if (need > 0) {
        const pool = candidates
          .filter((c) => rankFamily(c.rankAndGrade) === fam && !usedIds.has(c.id))
          .sort(
            (a, b) =>
              b.availableNow - a.availableNow ||
              b.availabilityNext6m - a.availabilityNext6m,
          );
        for (const c of pool.slice(0, need)) {
          usedIds.add(c.id);
          const freeNow = Math.round(c.availableNow * 100);
          chosen.push({
            consultantId: c.id,
            name: c.name,
            rank: c.rankAndGrade,
            skillset: c.skillsetCategory,
            freeNowPct: freeNow,
            endDate: c.endDate,
            role: `${fam} - ${c.skillsetCategory}`,
            fitScore: 60,
            reasoning:
              `${c.skillsetCategory} specialist` +
              (c.skillsetTools ? ` (${c.skillsetTools})` : "") +
              `; ${freeNow}% free now. Selected to complete the requested ${fam.toLowerCase()} headcount.`,
          });
          need--;
        }
      }
      if (need > 0) shortfalls.push(`${need} more ${fam}${need > 1 ? "s" : ""}`);
    }
    recommendations = chosen;
  } else {
    recommendations = modelRecs.sort((a, b) => b.fitScore - a.fitScore);
  }

  let finalSummary = summary;
  if (shortfalls.length > 0) {
    finalSummary =
      (finalSummary ? finalSummary + " " : "") +
      `Note: could not fully staff ${shortfalls.join(
        ", ",
      )} - not enough available candidates of that rank in the window.`;
  }

  return NextResponse.json({
    summary: finalSummary,
    recommendations,
    candidateCount: candidates.length,
    ...(recommendations.length === 0
      ? { note: "The model did not return usable matches. Try rephrasing the brief." }
      : {}),
  });
}
