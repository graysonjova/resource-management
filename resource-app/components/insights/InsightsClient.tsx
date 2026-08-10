"use client";

import {
  MessageSquare,
  Send,
  CalendarClock,
  ArrowUpRight,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Chip, Panel, PanelTitle, type Accent } from "@/components/ui/kit";
import { formatDate } from "@/lib/format";

interface RollOff {
  id: string;
  name: string;
  rank: string;
  skillset: string;
  endDate: string | null;
  weeksLeft: number;
  freeNowPct: number;
  currentEngagement: string;
}

interface Fact {
  label: string;
  value: string;
}

interface Suggestion {
  consultantId: string;
  suggestion: string;
  risk: string;
  targetSkillset: string;
}

const RISK_COLOR: Record<string, Accent> = {
  High: "danger",
  Medium: "warning",
  Low: "success",
};

const EXAMPLES = [
  "What's our AI/GenAI capacity right now?",
  "Which Singaporeans with AI skills are available?",
  "How many people are on the bench?",
];

function filterHref(filter: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v !== null && v !== undefined && String(v) !== "") sp.set(k, String(v));
  }
  return `/resources?${sp.toString()}`;
}

export function InsightsClient({
  rollingOff,
  embedded = false,
}: {
  rollingOff: RollOff[];
  embedded?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [filter, setFilter] = useState<Record<string, unknown> | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [planBusy, setPlanBusy] = useState(false);
  const [planErr, setPlanErr] = useState<string | null>(null);

  async function ask(q?: string) {
    const query = (q ?? question).trim();
    if (!query) return;
    if (q) setQuestion(q);
    setAskBusy(true);
    setAskErr(null);
    setAnswer(null);
    setFacts([]);
    setFilter(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setAnswer(data.answer ?? "");
      setFacts(data.facts ?? []);
      setFilter(data.filter ?? null);
    } catch (e) {
      setAskErr((e as Error).message);
    } finally {
      setAskBusy(false);
    }
  }

  async function generatePlan() {
    setPlanBusy(true);
    setPlanErr(null);
    try {
      const res = await fetch("/api/ai/redeploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: rollingOff.map((r) => r.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      const map: Record<string, Suggestion> = {};
      for (const s of data.suggestions ?? []) map[s.consultantId] = s;
      setSuggestions(map);
    } catch (e) {
      setPlanErr((e as Error).message);
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-2xl font-semibold text-ey-black">
            Insights &amp; foresight
          </h1>
          <p className="mt-1 text-sm text-ey-gray">
            Ask the roster questions in plain English, and get ahead of roll-offs with
            AI redeployment suggestions.
          </p>
        </div>
      )}

      {/* Chat with your roster */}
      <Panel>
        <PanelTitle>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare size={13} /> Chat with your roster
          </span>
        </PanelTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Ask anything about capacity, skills, or availability..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <button className="btn-primary" onClick={() => ask()} disabled={askBusy || !question.trim()}>
            <Send size={15} />
            {askBusy ? "Thinking..." : "Ask"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => ask(ex)}
              className="rounded-full border border-ey-gray-200 bg-white px-2.5 py-1 text-[11px] text-ey-gray transition-colors hover:border-ey-ink hover:text-ey-ink"
            >
              {ex}
            </button>
          ))}
        </div>

        {askErr && <p className="mt-3 text-sm text-state-danger">{askErr}</p>}

        {answer && (
          <div className="mt-4 space-y-3">
            <div className="rounded border-l-4 border-ey-yellow bg-ey-offwhite p-3 text-sm text-ey-ink">
              {answer}
            </div>
            {facts.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {facts.map((f, i) => (
                  <div
                    key={i}
                    className="rounded border border-ey-gray-100 bg-white px-3 py-2"
                  >
                    <div className="font-display text-lg font-bold text-ey-black">
                      {f.value}
                    </div>
                    <div className="text-xs text-ey-gray">{f.label}</div>
                  </div>
                ))}
              </div>
            )}
            {filter && Object.keys(filter).length > 0 && (
              <Link href={filterHref(filter)} className="btn-secondary inline-flex">
                <Wand2 size={14} /> View these people in the roster{" "}
                <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        )}
      </Panel>

      {/* Roll-off & redeployment */}
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <PanelTitle>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={13} /> Rolling Off Soon ({rollingOff.length})
            </span>
          </PanelTitle>
          {rollingOff.length > 0 && (
            <button className="btn-secondary" onClick={generatePlan} disabled={planBusy}>
              <Wand2 size={15} />
              {planBusy ? "Planning..." : "Generate redeployment plan"}
            </button>
          )}
        </div>

        {planErr && <p className="mb-3 text-sm text-state-danger">{planErr}</p>}

        {rollingOff.length === 0 ? (
          <p className="text-sm text-ey-gray">
            No one is rolling off in the next 16 weeks.
          </p>
        ) : (
          <ul className="space-y-2">
            {rollingOff.map((r) => {
              const s = suggestions[r.id];
              return (
                <li
                  key={r.id}
                  className="rounded border border-ey-gray-100 bg-ey-offwhite p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/resources/${r.id}`}
                        className="font-semibold text-ey-ink hover:underline"
                      >
                        {r.name}
                      </Link>
                      <Chip color="gray">{r.rank}</Chip>
                      <Chip color="ink">{r.skillset}</Chip>
                    </div>
                    <div className="text-xs text-ey-gray">
                      Ends {formatDate(r.endDate)} · in {r.weeksLeft}w
                    </div>
                  </div>
                  {s && (
                    <div className="mt-2 flex items-start gap-2 border-t border-ey-gray-200 pt-2">
                      <Chip color={RISK_COLOR[s.risk] ?? "gray"}>{s.risk} risk</Chip>
                      <p className="flex-1 text-sm text-ey-ink">
                        {s.suggestion}
                        {s.targetSkillset && (
                          <span className="text-ey-gray"> ({s.targetSkillset})</span>
                        )}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
