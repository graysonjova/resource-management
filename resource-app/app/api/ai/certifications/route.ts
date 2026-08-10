import { NextResponse } from "next/server";

import { compactConsultant } from "@/lib/ai";
import { getConsultants, getConsultantById } from "@/lib/data";
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

  const mode = body.mode === "org" ? "org" : "person";

  if (mode === "org") {
    const all = getConsultants();
    const roster = all.map((c) => ({
      rank: c.rankAndGrade,
      skillset: c.skillsetCategory,
      tools: c.skillsetTools,
      secondary: c.secondarySkill,
    }));

    const system =
      "You are an L&D strategist for a data & AI consulting firm. " +
      "Given the whole roster's skills, identify the firm's TOP skill gaps relative to " +
      "a modern data & AI practice (Data Engineering, AI/ML, Cloud Platforms, Data Governance) and " +
      "recommend a concrete certification/training for each gap. " +
      'Return STRICT JSON: {"summary": string (1-2 sentences), "gaps": [ ' +
      '{"skill": string, "affected": integer (people who would benefit), ' +
      '"recommendedCert": string, "provider": string, "priority": "High"|"Medium"|"Low", ' +
      '"rationale": string (1 sentence)} ] } (max 6 gaps). No prose outside JSON.';

    let content = "";
    try {
      content = await chat(
        [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ roster }) },
        ],
        { temperature: 0, jsonMode: true, maxTokens: 1200, reasoning: { enabled: false } },
      );
    } catch (e) {
      return NextResponse.json({ message: (e as Error).message }, { status: 502 });
    }

    const parsed = extractJson<{ summary?: string; gaps?: unknown[] }>(content);
    return NextResponse.json({
      mode: "org",
      summary: String(parsed?.summary ?? ""),
      gaps: Array.isArray(parsed?.gaps) ? parsed!.gaps : [],
    });
  }

  const consultant = getConsultantById(String(body.consultantId ?? ""));
  if (!consultant) {
    return NextResponse.json({ message: "Consultant not found." }, { status: 404 });
  }
  const targetRole = String(body.targetRole ?? "").trim();

  const system =
    "You are an L&D advisor for a data & AI consulting firm. " +
    "Given ONE consultant's current skills and experience, and a target profile, " +
    "assess how ready they are for that target and recommend specific certifications to close the gap. " +
    "The target is either the named target role/skillset, or if none is given, deepening their current skillset to the next level. " +
    'Return STRICT JSON: {"target": string (the target you assessed), ' +
    '"readinessPct": integer 0-100, ' +
    '"summary": string (1-2 sentences on where they stand), ' +
    '"certifications": [ {"name": string, "provider": string, ' +
    '"closesGap": string (what skill it builds), "effort": string (e.g. "6-8 weeks"), ' +
    '"priority": "High"|"Medium"|"Low"} ] } (2-4 certs, ordered by priority). No prose outside JSON.';

  const user = JSON.stringify({
    consultant: compactConsultant(consultant),
    targetRole: targetRole || "(deepen current skillset to the next level)",
  });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0, jsonMode: true, maxTokens: 1000, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }

  const parsed = extractJson<{
    target?: string;
    readinessPct?: number;
    summary?: string;
    certifications?: unknown[];
  }>(content);

  return NextResponse.json({
    mode: "person",
    consultantName: consultant.name,
    target: String(parsed?.target ?? targetRole ?? ""),
    readinessPct: Math.max(0, Math.min(100, Math.round(Number(parsed?.readinessPct) || 0))),
    summary: String(parsed?.summary ?? ""),
    certifications: Array.isArray(parsed?.certifications) ? parsed!.certifications : [],
  });
}
