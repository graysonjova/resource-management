"use client";

import {
  GraduationCap,
  Building2,
  Award,
} from "lucide-react";
import { useState } from "react";

import { Chip, Panel, PanelTitle, type Accent } from "@/components/ui/kit";
import { SKILLSET_CATEGORIES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  rank: string;
  skillset: string;
}

const SKILLSETS = [...SKILLSET_CATEGORIES];

const PRIORITY_COLOR: Record<string, Accent> = {
  High: "danger",
  Medium: "warning",
  Low: "gray",
};

interface Cert {
  name: string;
  provider: string;
  closesGap: string;
  effort: string;
  priority: string;
}
interface CertResult {
  target: string;
  readinessPct: number;
  summary: string;
  certifications: Cert[];
}
interface OrgGap {
  skill: string;
  affected: number;
  recommendedCert: string;
  provider: string;
  priority: string;
  rationale: string;
}

function ReadinessBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "#168736" : pct >= 50 ? "#FFE600" : "#B35C00";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ey-gray-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-display text-lg font-bold text-ey-black">{pct}%</span>
    </div>
  );
}

export function GrowthClient({
  people,
  embedded = false,
}: {
  people: Person[];
  embedded?: boolean;
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [targetRole, setTargetRole] = useState("");

  const [cert, setCert] = useState<CertResult | null>(null);
  const [certBusy, setCertBusy] = useState(false);
  const [certErr, setCertErr] = useState<string | null>(null);

  const [orgGaps, setOrgGaps] = useState<OrgGap[] | null>(null);
  const [orgSummary, setOrgSummary] = useState("");
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgErr, setOrgErr] = useState<string | null>(null);

  const selected = people.find((p) => p.id === personId);

  async function runCert() {
    setCertBusy(true);
    setCertErr(null);
    setCert(null);
    try {
      const res = await fetch("/api/ai/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "person", consultantId: personId, targetRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setCert(data);
    } catch (e) {
      setCertErr((e as Error).message);
    } finally {
      setCertBusy(false);
    }
  }

  async function runOrg() {
    setOrgBusy(true);
    setOrgErr(null);
    setOrgGaps(null);
    try {
      const res = await fetch("/api/ai/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "org" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setOrgGaps(data.gaps ?? []);
      setOrgSummary(data.summary ?? "");
    } catch (e) {
      setOrgErr((e as Error).message);
    } finally {
      setOrgBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-2xl font-semibold text-ey-black">
            Growth &amp; upskilling
          </h1>
          <p className="mt-1 text-sm text-ey-gray">
            AI-driven certification recommendations, grounded in each
            consultant&apos;s real skills and project history.
          </p>
        </div>
      )}

      {/* Shared consultant selector */}
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label">Consultant</label>
            <select
              className="input"
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value);
                setCert(null);
              }}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.rank} ({p.skillset})
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="flex flex-wrap gap-2 pb-1">
              <Chip color="gray">{selected.rank}</Chip>
              <Chip color="ink">{selected.skillset}</Chip>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelTitle>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap size={13} /> Certification Recommender
          </span>
        </PanelTitle>
          <div className="space-y-3">
            <div>
              <label className="label">Target (optional)</label>
              <select
                className="input"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                <option value="">Deepen current skillset (next level)</option>
                {SKILLSETS.map((s) => (
                  <option key={s} value={s}>
                    Move into {s}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary" onClick={runCert} disabled={certBusy}>
              <GraduationCap size={15} />
              {certBusy ? "Analysing..." : "Recommend certifications"}
            </button>

            {certErr && <p className="text-sm text-state-danger">{certErr}</p>}

            {cert && (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wider text-ey-gray">
                    Readiness for {cert.target}
                  </div>
                  <ReadinessBar pct={cert.readinessPct} />
                </div>
                <p className="text-sm text-ey-ink">{cert.summary}</p>
                <ul className="space-y-2">
                  {cert.certifications.map((c, i) => (
                    <li
                      key={i}
                      className="rounded border border-ey-gray-100 bg-ey-offwhite p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-ey-black">
                          <Award size={14} className="text-ey-gray" />
                          {c.name}
                        </div>
                        <Chip color={PRIORITY_COLOR[c.priority] ?? "gray"}>
                          {c.priority}
                        </Chip>
                      </div>
                      <div className="mt-1 text-xs text-ey-gray">
                        {c.provider} · {c.effort}
                      </div>
                      <p className="mt-1 text-sm text-ey-ink">Builds: {c.closesGap}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

      {/* Org-wide skill gaps */}
      <Panel>
        <PanelTitle>
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={13} /> Firm-wide Skill Gaps &amp; Training Priorities
          </span>
        </PanelTitle>
        <button className="btn-secondary" onClick={runOrg} disabled={orgBusy}>
          <Building2 size={15} />
          {orgBusy ? "Scanning roster..." : "Analyse the whole bench"}
        </button>

        {orgErr && <p className="mt-3 text-sm text-state-danger">{orgErr}</p>}
        {orgSummary && <p className="mt-3 text-sm text-ey-ink">{orgSummary}</p>}

        {orgGaps && orgGaps.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ey-gray-100 text-xs uppercase tracking-wider text-ey-gray">
                  <th className="py-2 pr-3">Skill gap</th>
                  <th className="py-2 pr-3">Benefit</th>
                  <th className="py-2 pr-3">Recommended training</th>
                  <th className="py-2 pr-3">Priority</th>
                </tr>
              </thead>
              <tbody>
                {orgGaps.map((g, i) => (
                  <tr key={i} className="border-b border-ey-gray-100">
                    <td className="py-2 pr-3 font-semibold text-ey-black">{g.skill}</td>
                    <td className="py-2 pr-3 text-ey-gray">{g.affected} people</td>
                    <td className="py-2 pr-3 text-ey-ink">
                      {g.recommendedCert}
                      <span className="text-ey-gray"> · {g.provider}</span>
                      <div className="text-xs text-ey-gray">{g.rationale}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <Chip color={PRIORITY_COLOR[g.priority] ?? "gray"}>{g.priority}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
