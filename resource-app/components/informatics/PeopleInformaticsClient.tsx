"use client";

import { Briefcase, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Chip, Panel, PanelTitle } from "@/components/ui/kit";
import { skillsetColor } from "@/lib/format";

export interface InformaticsPerson {
  id: string;
  name: string;
  rank: string;
  skillset: string;
  skills: string[];
  tools: string;
  secondarySkill: string;
  previousRoles: string;
  aspiringRoles: string;
  shortCv: string;
  currentEngagement: string;
}

export function PeopleInformaticsClient({
  people,
}: {
  people: InformaticsPerson[];
}) {
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const selected = people.find((p) => p.id === selectedId) ?? people[0];

  if (!selected) {
    return <p className="text-sm text-ey-gray">No consultants available.</p>;
  }

  const accent = skillsetColor(selected.skillset);
  const skills = selected.skills?.length
    ? selected.skills
    : selected.tools
      ? selected.tools.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ey-black">
          People informatics
        </h1>
        <p className="mt-1 text-sm text-ey-gray">
          Skills, engagement, and CV drawn from the roster workbook and resume
          deck.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-4 xl:col-span-3">
          <PanelTitle>Roster</PanelTitle>
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {people.map((p) => {
              const active = p.id === selected.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={
                      "w-full rounded border-l-4 px-3 py-2.5 text-left transition-colors " +
                      (active
                        ? "border-ey-yellow bg-ey-offwhite"
                        : "border-transparent hover:bg-ey-offwhite")
                    }
                  >
                    <div
                      className={
                        "text-sm font-semibold " +
                        (active ? "text-ey-black" : "text-ey-ink")
                      }
                    >
                      {p.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-ey-gray">{p.rank}</span>
                      <span className="text-[11px] text-ey-gray">
                        {p.skillset}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-4 lg:col-span-8 xl:col-span-9">
          <Panel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-ey-black">
                  {selected.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip color="gray">{selected.rank}</Chip>
                  {selected.skillset && (
                    <span
                      className="chip text-ey-ink"
                      style={{
                        borderColor: accent,
                        backgroundColor: accent + "26",
                      }}
                    >
                      {selected.skillset}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/resources/${selected.id}`}
                className="text-xs text-ey-ink underline hover:text-ey-black"
              >
                Open full profile →
              </Link>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Primary skills</PanelTitle>
            <div className="flex flex-wrap gap-2">
              {skills.length ? (
                skills.map((s) => (
                  <Chip key={s} color="ink">
                    {s}
                  </Chip>
                ))
              ) : (
                <p className="text-sm text-ey-gray">No primary skills listed.</p>
              )}
            </div>
            {selected.secondarySkill && (
              <div className="mt-4 border-t border-ey-gray-100 pt-3">
                <div className="mb-1 text-xs uppercase tracking-wider text-ey-gray">
                  Secondary
                </div>
                <p className="whitespace-pre-line text-sm text-ey-ink">
                  {selected.secondarySkill}
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelTitle>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase size={13} /> Roles & engagement
              </span>
            </PanelTitle>
            <div className="space-y-2 text-sm text-ey-ink">
              {selected.previousRoles && (
                <p>
                  <span className="text-ey-gray">Previous / current role: </span>
                  {selected.previousRoles}
                </p>
              )}
              {selected.aspiringRoles && (
                <p className="whitespace-pre-line">
                  <span className="text-ey-gray">Aspiring: </span>
                  {selected.aspiringRoles}
                </p>
              )}
              <p>
                <span className="text-ey-gray">Current engagement: </span>
                {selected.currentEngagement || "—"}
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} /> Short CV
              </span>
            </PanelTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ey-ink">
              {selected.shortCv || "No CV summary available."}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
