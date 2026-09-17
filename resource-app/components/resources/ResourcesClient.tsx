"use client";

import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CapacityBar, Chip, Panel } from "@/components/ui/kit";
import { isOnBench } from "@/lib/availability";
import { applyFilters, type Filters } from "@/lib/filters";
import { formatDate, skillsetColor } from "@/lib/format";
import { topSkills } from "@/lib/skills";
import type { Consultant } from "@/lib/types";

function uniq(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))].sort();
}

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

const chipColorFor = (cat: string) => {
  const c = skillsetColor(cat);
  return c;
};

function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function ResourcesClient({
  consultants,
  initialFilters,
}: {
  consultants: Consultant[];
  initialFilters: Filters;
}) {
  const [filters, setFilters] = useState<Filters>({
    availability: "all",
    ...initialFilters,
  });

  const options = useMemo(
    () => ({
      rank: uniq(consultants.map((c) => c.rank)),
      gender: uniq(consultants.map((c) => c.gender)),
      nationality: uniq(consultants.map((c) => c.nationality)),
      rolloffMonth: uniq(
        consultants
          .map((c) => c.endDate?.slice(0, 7) ?? "")
          .filter((month) => /^\d{4}-\d{2}$/.test(month)),
      ),
      // Combined Bucket Skillset values (top 10 by roster frequency).
      skillset: topSkills(consultants, 10),
    }),
    [consultants],
  );

  const filtered = useMemo(
    () => applyFilters(consultants, filters),
    [consultants, filters],
  );

  const set = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const reset = () => setFilters({ availability: "all" });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ey-black">
            Resource roster
          </h1>
          <p className="mt-1 text-sm text-ey-gray">
            {filtered.length} of {consultants.length} resources match your
            filters.
          </p>
        </div>
        <button className="btn-ghost" onClick={reset}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      <Panel>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <Field
            label="Rank"
            value={filters.rank ?? ""}
            options={options.rank}
            onChange={(v) => set({ rank: v || undefined })}
          />
          <Field
            label="Skill"
            value={filters.skillset ?? ""}
            options={options.skillset}
            onChange={(v) => set({ skillset: v || undefined })}
          />
          <Field
            label="Nationality"
            value={filters.nationality ?? ""}
            options={options.nationality}
            onChange={(v) => set({ nationality: v || undefined })}
          />
          <Field
            label="Gender"
            value={filters.gender ?? ""}
            options={options.gender}
            onChange={(v) => set({ gender: v || undefined })}
          />
          <div>
            <label className="label">Availability</label>
            <select
              className="input"
              value={filters.availability ?? "all"}
              onChange={(e) =>
                set({ availability: e.target.value as Filters["availability"] })
              }
            >
              <option value="all">Any</option>
              <option value="spare">Partially on bench</option>
              <option value="bench">On bench (0% allocated)</option>
              <option value="full">Fully allocated</option>
              <option value="within">Rolling off within 6 weeks</option>
            </select>
          </div>
          <div>
            <label className="label">Roll-off month</label>
            <select
              className="input"
              value={filters.rolloffMonth ?? ""}
              onChange={(e) =>
                set({ rolloffMonth: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              {options.rolloffMonth.map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Min free capacity</label>
            <select
              className="input"
              value={String(filters.minFreePct ?? 0)}
              onChange={(e) =>
                set({ minFreePct: Number(e.target.value) || undefined })
              }
            >
              <option value="0">Any</option>
              <option value="25">&ge; 25%</option>
              <option value="50">&ge; 50%</option>
              <option value="75">&ge; 75%</option>
              <option value="100">100% (fully free)</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Search</label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ey-gray"
              />
              <input
                className="input pl-9"
                placeholder="name, skill, tech, project..."
                value={filters.q ?? ""}
                onChange={(e) => set({ q: e.target.value || undefined })}
              />
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-ey-gray-100 bg-ey-offwhite text-xs uppercase tracking-wider text-ey-gray">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Skillset</th>
              <th className="px-4 py-3">Nationality</th>
              <th className="px-4 py-3">Engagement</th>
              <th className="px-4 py-3">Free now</th>
              <th className="px-4 py-3">End date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-ey-gray-100 transition-colors hover:bg-ey-offwhite"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/resources/${c.id}`}
                    className="font-semibold text-ey-ink hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="text-xs text-ey-gray">{c.gender}</div>
                </td>
                <td className="px-4 py-3 text-ey-ink">{c.rankAndGrade}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1" title={c.skillsetTools}>
                    {(c.skills ?? []).slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="chip text-ey-ink"
                        style={{
                          borderColor: chipColorFor(skill),
                          backgroundColor: chipColorFor(skill) + "26",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                    {(c.skills?.length ?? 0) > 3 && (
                      <span className="text-[11px] text-ey-gray">
                        +{(c.skills?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Chip color="gray">{c.nationality}</Chip>
                </td>
                <td className="px-4 py-3 text-ey-gray">
                  {isOnBench(c) ? (
                    <span className="font-semibold text-state-danger">On bench</span>
                  ) : (
                    c.currentEngagement
                  )}
                </td>
                <td className="px-4 py-3">
                  <CapacityBar available={c.availableNow} />
                </td>
                <td className="px-4 py-3 text-ey-gray">
                  {formatDate(c.endDate)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-ey-gray"
                >
                  No resources match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
