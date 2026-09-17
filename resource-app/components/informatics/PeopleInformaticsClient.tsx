"use client";

import {
  Award,
  Briefcase,
  Download,
  FileText,
  GraduationCap,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Chip, Panel, PanelTitle } from "@/components/ui/kit";
import { skillsetColor } from "@/lib/format";

export interface InformaticsPerson {
  id: string;
  name: string;
  rank: string;
  skills: string[];
  tools: string;
  secondarySkill: string;
  previousRoles: string;
  aspiringRoles: string;
  currentEngagement: string;
  resumeSlideNumber: number | null;
  cvSections: {
    background: string;
    relevantExperience: string;
    skills: string;
    education: string;
  };
}

function EducationBlock({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-sm text-ey-gray">No education section on this slide.</p>;
  }
  const rows = text.split(/\n\n+/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    return { period: lines[0] ?? "", detail: lines.slice(1).join("\n") };
  });
  const looksTabular = rows.some((r) => r.detail && /^\d{4}/.test(r.period));
  if (!looksTabular) {
    return (
      <p className="whitespace-pre-line text-sm leading-relaxed text-ey-ink">{text}</p>
    );
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-ey-gray-100 text-xs uppercase tracking-wider text-ey-gray">
          <th className="py-1.5 pr-3">Period</th>
          <th className="py-1.5">Discipline / University</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-ey-gray-100 align-top last:border-0">
            <td className="py-2 pr-3 whitespace-nowrap text-ey-ink">{r.period}</td>
            <td className="whitespace-pre-line py-2 text-ey-ink">{r.detail || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CvBlock({ text, empty }: { text: string; empty: string }) {
  if (!text.trim()) {
    return <p className="text-sm text-ey-gray">{empty}</p>;
  }
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-ey-ink">{text}</p>
  );
}

function skillLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function PeopleInformaticsClient({
  people,
}: {
  people: InformaticsPerson[];
}) {
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const selected = people.find((p) => p.id === selectedId) ?? people[0];

  if (!selected) {
    return <p className="text-sm text-ey-gray">No consultants available.</p>;
  }

  const buckets = selected.skills ?? [];
  const cvSkills = skillLines(selected.cvSections.skills);
  const query = search.trim().toLowerCase();
  const filteredPeople = query
    ? people.filter((person) =>
        [
          person.name,
          person.rank,
          person.previousRoles,
          ...person.skills,
          person.tools,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : people;

  async function downloadSlide() {
    if (!selected.resumeSlideNumber) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/resumes/${encodeURIComponent(selected.id)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Download failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.name} resume.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ey-black">
          People informatics
        </h1>
        <p className="mt-1 text-sm text-ey-gray">
          CVs are read from{" "}
          <span className="font-semibold text-ey-ink">
            Dummy Data Generated Resumes.pptx
          </span>
          . Excel and slide names are matched by normalized name-word overlap
          (75% minimum); unmatched people have no CV.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-4 xl:col-span-3">
          <PanelTitle>Roster</PanelTitle>
          <div className="relative mb-3">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ey-gray"
            />
            <input
              className="input pl-9"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people, roles or skills"
              aria-label="Search People Informatics roster"
            />
          </div>
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {filteredPeople.map((p) => {
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
                        {p.previousRoles || "No previous role listed"}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredPeople.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-ey-gray">
                No people match “{search.trim()}”.
              </li>
            )}
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
                  {buckets.map((bucket) => (
                    <span
                      key={bucket}
                      className="chip text-ey-ink"
                      style={{
                        borderColor: skillsetColor(bucket),
                        backgroundColor: skillsetColor(bucket) + "26",
                      }}
                    >
                      {bucket}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={downloadSlide}
                  disabled={!selected.resumeSlideNumber || downloading}
                >
                  <Download size={15} />
                  {downloading ? "Preparing..." : "Download resume"}
                </button>
                <Link
                  href={`/resources/${selected.id}`}
                  className="text-xs text-ey-ink underline hover:text-ey-black"
                >
                  Open full profile →
                </Link>
              </div>
            </div>
          </Panel>

          {(buckets.length > 0 || selected.secondarySkill) && (
            <Panel>
              <PanelTitle>Combined bucket skillset</PanelTitle>
              <div className="flex flex-wrap gap-2">
                {buckets.map((s) => (
                  <Chip key={s} color="ink">
                    {s}
                  </Chip>
                ))}
              </div>
              {selected.tools && (
                <p className="mt-3 text-xs text-ey-gray">
                  Platform / tools:{" "}
                  <span className="text-ey-ink">{selected.tools}</span>
                </p>
              )}
              {selected.secondarySkill && (
                <p className="mt-2 whitespace-pre-line text-xs text-ey-gray">
                  Secondary:{" "}
                  <span className="text-ey-ink">{selected.secondarySkill}</span>
                </p>
              )}
            </Panel>
          )}

          <Panel>
            <PanelTitle>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase size={13} /> Roles &amp; engagement
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel>
              <PanelTitle>
                <span className="inline-flex items-center gap-1.5">
                  <User size={13} /> Background
                </span>
              </PanelTitle>
              <CvBlock
                text={selected.cvSections.background}
                empty="No background section on this slide."
              />
            </Panel>
            <Panel>
              <PanelTitle>
                <span className="inline-flex items-center gap-1.5">
                  <Award size={13} /> Skills
                </span>
              </PanelTitle>
              {cvSkills.length ? (
                <div className="flex flex-wrap gap-2">
                  {cvSkills.map((s) => (
                    <Chip key={s} color="yellow">
                      {s}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ey-gray">
                  No skills section on this slide.
                </p>
              )}
            </Panel>
            <Panel>
              <PanelTitle>
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap size={13} /> Education
                </span>
              </PanelTitle>
              <EducationBlock text={selected.cvSections.education} />
            </Panel>
            <Panel className="md:col-span-2">
              <PanelTitle>
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={13} /> Relevant experience
                </span>
              </PanelTitle>
              <CvBlock
                text={selected.cvSections.relevantExperience}
                empty="No relevant experience on this slide."
              />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
