import { NextResponse } from "next/server";

import { getConsultants } from "@/lib/data";
import { chat, extractJson } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Suggestion {
  name: string;
  suggestion: string;
  risk: "High" | "Medium" | "Low" | string;
  targetSkillset?: string;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
  }

  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
  const all = getConsultants();
  const targets = all.filter((c) => ids.includes(c.id));
  if (targets.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Supply signal: how many people currently have spare capacity per skillset.
  const supplyBySkillset: Record<string, number> = {};
  for (const c of all) {
    if (c.availableNow > 0) {
      supplyBySkillset[c.skillsetCategory] =
        (supplyBySkillset[c.skillsetCategory] ?? 0) + 1;
    }
  }

  const rollingOff = targets.map((c) => ({
    name: c.name,
    rank: c.rankAndGrade,
    skillset: c.skillsetCategory,
    tools: c.skillsetTools,
    secondary: c.secondarySkill,
    endDate: c.endDate,
    aspiring: c.aspiringRoles,
    experience: c.experienceCV.replace(/\s+/g, " ").slice(0, 220),
  }));

  const system =
    "You are a resource manager for a data & AI consulting firm. " +
    "These consultants are rolling off their engagements soon. For EACH one, recommend the best " +
    "next move so they stay billable: redeploy to a specific type of engagement, reallocate to a " +
    "skill area that is in short supply, or (if their skills are oversupplied) flag bench risk and " +
    "suggest upskilling. Use the supply signal (fewer available people in a skillset = higher demand). " +
    'Return STRICT JSON: {"suggestions": [ {"name": exactly as given, ' +
    '"suggestion": string (1-2 sentences, concrete), "risk": "High"|"Medium"|"Low", ' +
    '"targetSkillset": string} ] }. No prose outside JSON.';

  const user = JSON.stringify({ supplyBySkillset, rollingOff });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0, jsonMode: true, maxTokens: 1400, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }

  const parsed = extractJson<{ suggestions?: Suggestion[] } | Suggestion[]>(content);
  const raw: Suggestion[] = Array.isArray(parsed)
    ? parsed
    : parsed?.suggestions ?? [];

  const byName = new Map(all.map((c) => [c.name.toLowerCase(), c]));
  const suggestions = raw
    .map((s) => {
      const c = byName.get(String(s.name).toLowerCase());
      if (!c) return null;
      return {
        consultantId: c.id,
        suggestion: String(s.suggestion ?? ""),
        risk: String(s.risk ?? "Medium"),
        targetSkillset: String(s.targetSkillset ?? ""),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ suggestions });
}
