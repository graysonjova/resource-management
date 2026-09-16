import { NextResponse } from "next/server";

import { compactConsultant } from "@/lib/ai";
import { isOnBench, isPartiallyOnBench } from "@/lib/availability";
import { getConsultants } from "@/lib/data";
import { chat, extractJson } from "@/lib/azureOpenAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tally(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of items) out[k] = (out[k] ?? 0) + 1;
  return out;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
  }

  const question = String(body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ message: "Ask a question." }, { status: 400 });
  }

  const all = getConsultants();
  const stats = {
    total: all.length,
    byRank: tally(all.map((c) => c.rankAndGrade)),
    bySkillset: tally(all.map((c) => c.skillsetCategory)),
    byNationality: tally(all.map((c) => c.nationality)),
    onBench: all.filter(isOnBench).length,
    partlyFreeNow: all.filter(isPartiallyOnBench).length,
  };
  const roster = all.map(compactConsultant);

  const system =
    "You are a resource analyst for a data & AI consulting firm. " +
    "Answer the user's question using ONLY the provided roster and precomputed stats. " +
    "Be concise and specific with real numbers and names from the data. " +
    "If it cannot be answered from the data, say so plainly. " +
    'Return STRICT JSON: {"answer": string (2-4 sentences, plain text), ' +
    '"facts": [ {"label": string, "value": string} ] (0-6 key figures), ' +
    '"filter": object|null (a roster filter that surfaces the relevant people, using any of ' +
    'the keys rank, gender, nationality, skillset, availability("spare"|"bench"|"all"), minFreePct, q; ' +
    "or null if not applicable) }. No prose outside the JSON.";

  const user = JSON.stringify({ question, stats, roster });

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0, jsonMode: true, maxTokens: 900, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }

  const parsed = extractJson<{
    answer?: string;
    facts?: unknown[];
    filter?: Record<string, unknown> | null;
  }>(content);

  return NextResponse.json({
    answer: String(parsed?.answer ?? "I couldn't derive an answer from the roster."),
    facts: Array.isArray(parsed?.facts) ? parsed!.facts : [],
    filter: parsed?.filter && typeof parsed.filter === "object" ? parsed.filter : null,
  });
}
