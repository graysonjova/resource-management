"use client";

import { Sparkles, Users, Layers, FileText, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Chip, Panel, PanelTitle } from "@/components/ui/kit";
import { formatDate } from "@/lib/format";

const SKILLSETS = ["Data Engineering", "AI / GenAI", "MLOps", "Data Governance"];

const EXAMPLES = [
  "A team of 2 seniors and 3 associates for an LLM-RAG platform",
  "One data governance consultant for a PDPA compliance review",
  "A small MLOps squad to productionise 3 models by Q1",
];

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

interface Slot {
  role: string;
  rank: string;
  skillset: string;
  count: number;
  rationale: string;
}

interface Highlight {
  alias: string;
  rank: string;
  skillset: string;
  highlight: string;
}

function FitBar({ score }: { score: number }) {
  const color = score >= 75 ? "#168736" : score >= 50 ? "#FFE600" : "#B35C00";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-ey-gray-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-display text-sm font-bold text-ey-black">
        {score}
      </span>
    </div>
  );
}

export default function StaffingPage() {
  // Recommender state
  const [brief, setBrief] = useState("");
  const [skillset, setSkillset] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [allocationPct, setAllocationPct] = useState(50);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [recBusy, setRecBusy] = useState(false);
  const [recErr, setRecErr] = useState<string | null>(null);
  const [recNote, setRecNote] = useState<string | null>(null);

  // Team composer state
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [composeSummary, setComposeSummary] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeErr, setComposeErr] = useState<string | null>(null);

  // Proposal state
  const [narrative, setNarrative] = useState<string>("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalErr, setProposalErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function runRecommend() {
    setRecBusy(true);
    setRecErr(null);
    setRecNote(null);
    setRecs(null);
    setSummary("");
    setNarrative("");
    setHighlights([]);
    setProposalErr(null);
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          skillset,
          requiredSkills,
          startDate,
          endDate,
          allocationPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setRecs(data.recommendations ?? []);
      setSummary(data.summary ?? "");
      if (data.note) setRecNote(data.note);
    } catch (e) {
      setRecErr((e as Error).message);
    } finally {
      setRecBusy(false);
    }
  }

  async function runCompose() {
    setComposeBusy(true);
    setComposeErr(null);
    setSlots(null);
    setComposeSummary("");
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setSlots(data.slots ?? []);
      setComposeSummary(data.summary ?? "");
    } catch (e) {
      setComposeErr((e as Error).message);
    } finally {
      setComposeBusy(false);
    }
  }

  async function runProposal() {
    if (!recs || recs.length === 0) return;
    setProposalBusy(true);
    setProposalErr(null);
    setNarrative("");
    setHighlights([]);
    setCopied(false);
    try {
      const res = await fetch("/api/ai/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagement: brief,
          consultantIds: recs.map((r) => r.consultantId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setNarrative(data.narrative ?? "");
      setHighlights(data.highlights ?? []);
    } catch (e) {
      setProposalErr((e as Error).message);
    } finally {
      setProposalBusy(false);
    }
  }

  function copyProposal() {
    const text = [
      narrative,
      "",
      ...highlights.map((h) => `- ${h.alias} (${h.rank}, ${h.skillset}): ${h.highlight}`),
    ].join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ey-black">
          AI recommender
        </h1>
        <p className="mt-1 text-sm text-ey-gray">
          Powered by DeepSeek via OpenRouter. Design a team shape, match real people
          to it, and generate a client proposal.
        </p>
      </div>

      {/* AI Recommender - primary tool */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <PanelTitle>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={13} /> Staffing Recommender
            </span>
          </PanelTitle>
          <p className="-mt-1 mb-3 text-xs text-ey-gray">
            Describe one role or a whole team. The AI picks 1-to-many people from
            your available bench.
          </p>

          <div className="space-y-3">
            <div>
              <label className="label">Engagement brief</label>
              <textarea
                className="input min-h-[90px]"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. A team of 2 seniors and 3 associates for an LLM-RAG platform"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setBrief(ex)}
                    className="rounded-full border border-ey-gray-200 bg-white px-2.5 py-1 text-left text-[11px] text-ey-gray transition-colors hover:border-ey-ink hover:text-ey-ink"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <details className="rounded border border-ey-gray-100 bg-ey-offwhite p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-ey-gray">
                Optional refinements
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="label">Primary skillset</label>
                  <select
                    className="input"
                    value={skillset}
                    onChange={(e) => setSkillset(e.target.value)}
                  >
                    <option value="">Infer from brief</option>
                    {SKILLSETS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Key skills / tech</label>
                  <input
                    className="input"
                    value={requiredSkills}
                    onChange={(e) => setRequiredSkills(e.target.value)}
                    placeholder="e.g. LangChain, RAG, Python"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Start</label>
                    <input
                      type="date"
                      className="input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">End</label>
                    <input
                      type="date"
                      className="input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">
                    Allocation needed per person: {allocationPct}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={10}
                    className="w-full accent-ey-ink"
                    value={allocationPct}
                    onChange={(e) => setAllocationPct(Number(e.target.value))}
                  />
                </div>
              </div>
            </details>

            <div className="flex flex-col gap-2">
              <button
                className="btn-primary w-full"
                onClick={runRecommend}
                disabled={recBusy || !brief.trim()}
              >
                <Sparkles size={16} />
                {recBusy ? "Matching..." : "Recommend People"}
              </button>
              <button
                className="btn-ghost w-full"
                onClick={runCompose}
                disabled={composeBusy || !brief.trim()}
                title="Design the ideal team shape (roles & ranks) before matching people"
              >
                <Layers size={15} />
                {composeBusy ? "Designing..." : "Design team shape first"}
              </button>
            </div>

            {composeErr && <p className="text-sm text-state-danger">{composeErr}</p>}

            {slots && (
              <div className="rounded border-l-4 border-ey-yellow bg-ey-offwhite p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ey-black">
                  Proposed team shape
                </div>
                {composeSummary && (
                  <p className="mb-2 text-sm text-ey-ink">{composeSummary}</p>
                )}
                <ul className="space-y-1.5">
                  {slots.map((s, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-semibold text-ey-black">
                        {s.count}× {s.rank}
                      </span>{" "}
                      <span className="text-ey-ink">- {s.role}</span>
                      <span className="text-ey-gray"> · {s.skillset}</span>
                      <div className="text-xs text-ey-gray">{s.rationale}</div>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ey-gray">
                  Now click{" "}
                  <span className="font-semibold text-ey-black">Recommend People</span>{" "}
                  to fill these slots from the bench.
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelTitle>
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} /> Recommended People
              {recs && recs.length > 0 && (
                <span className="text-ey-gray">({recs.length})</span>
              )}
            </span>
          </PanelTitle>

          {recErr && <p className="text-sm text-state-danger">{recErr}</p>}
          {recNote && !recErr && <p className="text-sm text-ey-gray">{recNote}</p>}

          {summary && (
            <div className="mb-3 rounded border-l-4 border-ey-yellow bg-ey-offwhite p-3 text-sm text-ey-ink">
              {summary}
            </div>
          )}

          {!recs && !recBusy && !recErr && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-ey-gray">
              <Users size={30} className="text-ey-gray-200" />
              <p>
                Describe your engagement on the left and let the AI assemble the
                right people.
              </p>
            </div>
          )}

          {recBusy && (
            <div className="animate-pulse py-12 text-center text-ey-gray">
              Matching people to your brief...
            </div>
          )}

          {recs && recs.length > 0 && (
            <ol className="space-y-3">
              {recs.map((r, i) => (
                <li
                  key={r.consultantId}
                  className="rounded border border-ey-gray-100 bg-ey-offwhite p-3 transition-colors hover:border-ey-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs text-ey-gray">
                          #{i + 1}
                        </span>
                        <Link
                          href={`/resources/${r.consultantId}`}
                          className="font-semibold text-ey-ink hover:underline"
                        >
                          {r.name}
                        </Link>
                        {r.role && (
                          <span className="rounded-full bg-ey-yellow px-2 py-0.5 text-[11px] font-semibold text-ey-black">
                            {r.role}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Chip color="gray">{r.rank}</Chip>
                        <Chip color="ink">{r.skillset}</Chip>
                        <Chip color="success">{r.freeNowPct}% free now</Chip>
                      </div>
                    </div>
                    <FitBar score={r.fitScore} />
                  </div>
                  <p className="mt-2 text-sm text-ey-ink">{r.reasoning}</p>
                  <div className="mt-1 text-xs text-ey-gray">
                    Rolls off: {formatDate(r.endDate)}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {recs && recs.length > 0 && (
            <div className="mt-4 border-t border-ey-gray-100 pt-4">
              <button
                className="btn-secondary"
                onClick={runProposal}
                disabled={proposalBusy}
              >
                <FileText size={15} />
                {proposalBusy ? "Writing..." : "Generate client proposal"}
              </button>

              {proposalErr && (
                <p className="mt-2 text-sm text-state-danger">{proposalErr}</p>
              )}

              {narrative && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-ey-black">
                      Client-facing staffing narrative
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={copyProposal}
                      title="Copy proposal text"
                    >
                      <Copy size={13} /> {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="rounded border border-ey-gray-100 bg-ey-offwhite p-3 text-sm leading-relaxed text-ey-ink">
                    {narrative}
                  </div>
                  {highlights.length > 0 && (
                    <ul className="space-y-1.5">
                      {highlights.map((h, i) => (
                        <li key={i} className="text-sm text-ey-ink">
                          <span className="font-semibold text-ey-black">{h.alias}</span>{" "}
                          <span className="text-ey-gray">
                            ({h.rank} · {h.skillset})
                          </span>
                          : {h.highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-ey-gray">
                    Names are anonymised for client sharing.
                  </p>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
