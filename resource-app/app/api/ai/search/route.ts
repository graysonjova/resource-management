import { NextResponse } from "next/server";

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

  const query = String(body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ message: "Empty query." }, { status: 400 });
  }

  const system =
    "You translate a natural-language staffing query into a JSON filter object for a " +
    "consulting resource roster. Allowed keys and values:\n" +
    '- rank: one of "Intern","Associate","Senior","Manager" (Intern also matches Intern (CS))\n' +
    '- gender: "Male" or "Female"\n' +
    '- nationality: "Singaporean","PR","Long-term Pass" (also accept "Citizen" as Singaporean)\n' +
    "- skillset: a Combined Bucket Skillset value, e.g. " +
    '"Data Engineering","Data Architecture","Business Intelligence & Analytics",' +
    '"Artificial Intelligence (AI) & Machine Learning","Data Governance & Quality",' +
    '"Data Security & Privacy","Data Strategy & Management","Cloud Data Platforms & Operations"\n' +
    '- availability: "all","bench","spare","within"\n' +
    "- withinWeeks: integer (only with availability=within)\n" +
    "- minFreePct: integer 0-100\n" +
    "- q: free-text keyword for skills/tech/projects\n" +
    'Map phrases like "available now"/"free" -> availability:"spare"; ' +
    '"on the bench" -> availability:"bench"; "Singaporean"/"local"/"Citizen" -> nationality:"Singaporean"; ' +
    '"AI"/"GenAI"/"ML" -> skillset:"Artificial Intelligence (AI) & Machine Learning"; ' +
    '"governance" -> "Data Governance & Quality"; "cloud" -> "Cloud Data Platforms & Operations". ' +
    "Return STRICT JSON with ONLY the keys that apply. No commentary.";

  let content = "";
  try {
    content = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: query },
      ],
      { temperature: 0, jsonMode: true, maxTokens: 400, reasoning: { enabled: false } },
    );
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error).message },
      { status: 502 },
    );
  }

  const filters = extractJson<Record<string, unknown>>(content) ?? {};
  return NextResponse.json({ filters });
}
