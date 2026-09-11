import { NextResponse } from "next/server";

import { compactConsultant } from "@/lib/ai";
import { getConsultants } from "@/lib/data";
import { chat, extractJson } from "@/lib/azureOpenAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
  }

  const engagement = String(body.engagement ?? "").trim();
  const ids: string[] = Array.isArray(body.consultantIds)
    ? body.consultantIds.map(String)
    : [];

  const all = getConsultants();
  const team = all.filter((c) => ids.includes(c.id));
  if (team.length === 0) {
    return NextResponse.json(
      { message: "Select at least one team member first." },
      { status: 400 },
    );
  }

  // Anonymise: the client-facing narrative should not leak internal names.
  const members = team.map((c, i) => ({
    alias: `Consultant ${String.fromCharCode(65 + i)}`,
    ...compactConsultant(c),
  }));

  const system =
    "You are a proposal writer at a data & AI consulting firm. " +
    "Write a concise, confident CLIENT-FACING staffing narrative for the proposed team, then a short " +
    "anonymised highlight for each member. Do NOT use real names - refer to members by their alias and rank. " +
    'Return STRICT JSON: {"narrative": string (one polished paragraph, 3-5 sentences, ' +
    "explaining why this team is well-suited to the engagement and how the ranks complement each other), " +
    '"highlights": [ {"alias": string, "rank": string, "skillset": string, ' +
    '"highlight": string (1-2 sentences of anonymised, client-safe experience)} ] }. ' +
    "No prose outside JSON.";

  const user = JSON.stringify({
    engagement: engagement || "(engagement not specified)",
    team: members,
  });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.2, jsonMode: true, maxTokens: 1500, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }

  const parsed = extractJson<{ narrative?: string; highlights?: unknown[] }>(content);
  return NextResponse.json({
    narrative: String(parsed?.narrative ?? ""),
    highlights: Array.isArray(parsed?.highlights) ? parsed!.highlights : [],
  });
}
