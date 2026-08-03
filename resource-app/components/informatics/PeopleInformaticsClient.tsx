"use client";

import { Activity, FileText, History, Radar as RadarIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ChartRadar } from "@/components/charts/ChartKit";
import { Chip, Panel, PanelTitle } from "@/components/ui/kit";
import { skillsetColor } from "@/lib/format";
import { buildPlaceholderInformatics } from "@/lib/placeholderInformatics";

export interface InformaticsPerson {
  id: string;
  name: string;
  rank: string;
  skillset: string;
  tools: string;
  secondarySkill: string;
  previousRoles: string;
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

  const profile = useMemo(
    () =>
      selected
        ? buildPlaceholderInformatics(
            selected.id,
            selected.skillset,
            selected.previousRoles || selected.secondarySkill,
          )
        : null,
    [selected],
  );

  if (!selected || !profile) {
    return <p className="text-sm text-ey-gray">No consultants available.</p>;
  }

  const accent = skillsetColor(selected.skillset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ey-black">
          People informatics
        </h1>
        <p className="mt-1 text-sm text-ey-gray">
          Multi-dimensional skill view inspired by Merit Metrics. Skill scores,
          secondary tags, and engagement history below are{" "}
          <span className="font-semibold text-ey-black">placeholder demo data</span>{" "}
          — CVs and roster details come from the Excel file.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Person list */}
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

        {/* Detail */}
        <div className="space-y-4 lg:col-span-8 xl:col-span-9">
          <Panel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-ey-black">
                  {selected.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip color="gray">{selected.rank}</Chip>
                  <span
                    className="chip text-ey-ink"
                    style={{
                      borderColor: accent,
                      backgroundColor: accent + "26",
                    }}
                  >
                    {selected.skillset}
                  </span>
                  <Chip color="warning">Demo scores</Chip>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-ey-gray">
                  Overall (placeholder)
                </div>
                <div className="font-display text-3xl font-bold text-ey-black">
                  {profile.overallScore}
                </div>
                <Link
                  href={`/resources/${selected.id}`}
                  className="mt-1 inline-block text-xs text-ey-ink underline hover:text-ey-black"
                >
                  Open full profile →
                </Link>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel>
              <PanelTitle>
                <span className="inline-flex items-center gap-1.5">
                  <RadarIcon size={13} /> Functional skills
                </span>
              </PanelTitle>
              <p className="-mt-2 mb-1 text-[11px] text-ey-gray">
                Solid = person · dashed = team median (placeholder)
              </p>
              <ChartRadar
                data={profile.functional}
                color="#2E2E38"
                median={profile.medianFunctional}
              />
            </Panel>

            <Panel>
              <PanelTitle>
                <span className="inline-flex items-center gap-1.5">
                  <Activity size={13} /> Technical skills
                </span>
              </PanelTitle>
              <p className="-mt-2 mb-1 text-[11px] text-ey-gray">
                Solid = person · dashed = team median (placeholder)
              </p>
              <ChartRadar
                data={profile.technical}
                color="#E1CB00"
                median={profile.medianTechnical}
              />
            </Panel>
          </div>

          <Panel>
            <PanelTitle>Secondary skills (placeholder)</PanelTitle>
            <div className="flex flex-wrap gap-2">
              {profile.secondarySkills.map((s) => (
                <Chip key={s} color="ink">
                  {s}
                </Chip>
              ))}
            </div>
            {selected.secondarySkill && (
              <p className="mt-3 text-xs text-ey-gray">
                From Excel secondary field:{" "}
                <span className="text-ey-ink">{selected.secondarySkill}</span>
              </p>
            )}
            {selected.tools && (
              <p className="mt-1 text-xs text-ey-gray">
                Primary tools:{" "}
                <span className="text-ey-ink">{selected.tools}</span>
              </p>
            )}
          </Panel>

          <Panel>
            <PanelTitle>
              <span className="inline-flex items-center gap-1.5">
                <History size={13} /> Engagement history (placeholder)
              </span>
            </PanelTitle>
            <ol className="relative space-y-0 border-l border-ey-gray-200 pl-4">
              {profile.engagementHistory.map((e, i) => (
                <li key={i} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ey-yellow bg-white" />
                  <div className="text-xs text-ey-gray">{e.period}</div>
                  <div className="font-semibold text-ey-black">{e.engagement}</div>
                  <div className="text-sm text-ey-gray">
                    {e.role} · {e.outcome}
                  </div>
                </li>
              ))}
            </ol>
            {selected.currentEngagement &&
              selected.currentEngagement.toLowerCase() !== "on bench" && (
                <p className="mt-3 border-t border-ey-gray-100 pt-3 text-xs text-ey-gray">
                  Current engagement (Excel):{" "}
                  <span className="text-ey-ink">
                    {selected.currentEngagement}
                  </span>
                </p>
              )}
          </Panel>

          <Panel>
            <PanelTitle>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} /> Short CV
              </span>
            </PanelTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ey-ink">
              {selected.shortCv || "No experience summary in the Excel file."}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
