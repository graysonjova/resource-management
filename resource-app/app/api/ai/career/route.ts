import { NextResponse } from "next/server";

import { compactConsultant, rankFamily, nextRank } from "@/lib/ai";
import { getConsultantById } from "@/lib/data";
import { chat, extractJson } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
  }

  const consultant = getConsultantById(String(body.consultantId ?? ""));
  if (!consultant) {
    return NextResponse.json({ message: "Consultant not found." }, { status: 404 });
  }

  const fam = rankFamily(consultant.rankAndGrade);
  const target = fam ? nextRank(fam) : null;

  if (!target) {
    return NextResponse.json({
      consultantName: consultant.name,
      currentRank: consultant.rankAndGrade,
      targetRank: null,
      readinessPct: 100,
      summary: "Already at the most senior rank tracked here.",
      checklist: [],
    });
  }

  const system =
    "You are a career-development advisor at a data & AI consulting firm. " +
    "Assess how ready ONE consultant is for promotion to the next rank, based on their current " +
    "rank, skills, project history and aspirations. Be realistic and specific. " +
    'Return STRICT JSON: {"readinessPct": integer 0-100, ' +
    '"summary": string (1-2 sentences on their promotion case), ' +
    '"checklist": [ {"item": string (a concrete milestone: a project type, a skill, a leadership behaviour, or a cert), ' +
    '"done": boolean (whether their profile already shows evidence of it)} ] } (4-6 items). No prose outside JSON.';

  const user = JSON.stringify({
    consultant: compactConsultant(consultant),
    currentRank: consultant.rankAndGrade,
    targetRank: target,
  });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0, jsonMode: true, maxTokens: 1100, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }

  const parsed = extractJson<{
    readinessPct?: number;
    summary?: string;
    checklist?: unknown[];
  }>(content);

  return NextResponse.json({
    consultantName: consultant.name,
    currentRank: consultant.rankAndGrade,
    targetRank: target,
    readinessPct: Math.max(0, Math.min(100, Math.round(Number(parsed?.readinessPct) || 0))),
    summary: String(parsed?.summary ?? ""),
    checklist: Array.isArray(parsed?.checklist) ? parsed!.checklist : [],
  });
}
