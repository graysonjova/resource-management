import { NextResponse } from "next/server";

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

  const c = getConsultantById(String(body.consultantId ?? ""));
  if (!c) {
    return NextResponse.json({ message: "Consultant not found." }, { status: 404 });
  }

  const system =
    "You extract structured tags from a consultant's free-text CV and project history. " +
    "Normalise messy text into clean, deduplicated tags. Only use information present in the input. " +
    'Return STRICT JSON: {"skills": string[] (specific technical skills), ' +
    '"tools": string[] (named technologies/platforms), ' +
    '"industries": string[] (domains/verticals they have worked in), ' +
    '"strengths": string[] (2-4 short standout strengths) }. ' +
    "Keep each array to at most 8 concise items. No prose outside JSON.";

  const user = JSON.stringify({
    rank: c.rankAndGrade,
    primarySkillset: c.skillsetCategory,
    tools: c.skillsetTools,
    secondary: c.secondarySkill,
    previousRoles: c.previousRoles,
    aspiring: c.aspiringRoles,
    experience: c.experienceCV.replace(/\s+/g, " ").slice(0, 600),
  });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0, jsonMode: true, maxTokens: 700, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }

  const parsed = extractJson<{
    skills?: string[];
    tools?: string[];
    industries?: string[];
    strengths?: string[];
  }>(content);

  const clean = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 8) : [];

  return NextResponse.json({
    skills: clean(parsed?.skills),
    tools: clean(parsed?.tools),
    industries: clean(parsed?.industries),
    strengths: clean(parsed?.strengths),
  });
}
