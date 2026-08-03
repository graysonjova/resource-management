import { NextResponse } from "next/server";

import { getConsultants } from "@/lib/data";
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

  const brief = String(body.brief ?? "").trim();
  if (!brief) {
    return NextResponse.json({ message: "Describe the engagement." }, { status: 400 });
  }

  // Bench context so the shape is realistic against who we actually have.
  const all = getConsultants();
  const supply: Record<string, number> = {};
  for (const c of all) {
    const key = `${c.rank} / ${c.skillsetCategory}`;
    supply[key] = (supply[key] ?? 0) + 1;
  }

  const system =
    "You are an engagement architect at a data & AI consulting firm. " +
    "From an engagement brief, design the IDEAL team SHAPE (roles and headcount) - not specific people. " +
    "Base ranks on: Intern, Associate, Senior, Manager. Keep it realistic for the described scope. " +
    'Return STRICT JSON: {"summary": string (1-2 sentences on the team design), ' +
    '"slots": [ {"role": string (e.g. "RAG lead"), "rank": "Intern"|"Associate"|"Senior"|"Manager", ' +
    '"skillset": string, "count": integer, "rationale": string (1 sentence why this slot)} ] }. ' +
    "No prose outside JSON.";

  const user = JSON.stringify({ brief, benchSupply: supply });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0, jsonMode: true, maxTokens: 1200, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }

  const parsed = extractJson<{ summary?: string; slots?: unknown[] }>(content);
  return NextResponse.json({
    summary: String(parsed?.summary ?? ""),
    slots: Array.isArray(parsed?.slots) ? parsed!.slots : [],
  });
}
