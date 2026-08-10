"use client";

import {
  ArrowLeft,
  Briefcase,
  CalendarPlus,
  Flag,
  Target,
  UserCircle2,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ChartBar } from "@/components/charts/ChartKit";
import { BookingModal } from "@/components/booking/BookingModal";
import { CapacityBar, Chip, Panel, PanelTitle } from "@/components/ui/kit";
import { formatDate, skillsetColor } from "@/lib/format";
import type { Booking, Consultant } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-ey-gray">{label}</span>
      <span className="text-right text-ey-ink">{value}</span>
    </div>
  );
}

export function ProfileClient({
  consultant,
  bookings,
}: {
  consultant: Consultant;
  bookings: Booking[];
}) {
  const [open, setOpen] = useState(false);
  const color = skillsetColor(consultant.skillsetCategory);

  const [tags, setTags] = useState<{
    skills: string[];
    tools: string[];
    industries: string[];
    strengths: string[];
  } | null>(null);
  const [tagsBusy, setTagsBusy] = useState(false);
  const [tagsErr, setTagsErr] = useState<string | null>(null);

  async function runAutoTag() {
    setTagsBusy(true);
    setTagsErr(null);
    try {
      const res = await fetch("/api/ai/autotag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId: consultant.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Request failed.");
      setTags(data);
    } catch (e) {
      setTagsErr((e as Error).message);
    } finally {
      setTagsBusy(false);
    }
  }

  const weekly = consultant.weekly.map((w) => ({
    name: w.label,
    value: Math.round(w.allocation * 100),
    color: w.allocation === 0 ? "#C4C4CD" : w.allocation < 1 ? "#FFE600" : "#2E2E38",
  }));

  return (
    <div className="space-y-5">
      <Link
        href="/resources"
        className="inline-flex items-center gap-2 text-sm text-ey-gray hover:text-ey-ink"
      >
        <ArrowLeft size={15} /> Back to roster
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="grid h-16 w-16 place-items-center rounded-lg border text-2xl font-bold text-ey-ink"
            style={{ borderColor: color, backgroundColor: color + "26" }}
          >
            <UserCircle2 />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ey-black">
              {consultant.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Chip color="gray">{consultant.rankAndGrade}</Chip>
              <span
                className="chip text-ey-ink"
                style={{ borderColor: color, backgroundColor: color + "26" }}
              >
                {consultant.skillsetCategory}
              </span>
              <Chip color="gray">{consultant.benchCategory}</Chip>
            </div>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <CalendarPlus size={16} /> Book this resource
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <PanelTitle>Profile</PanelTitle>
          <Row label="Gender" value={consultant.gender} />
          <Row label="Nationality" value={consultant.nationality} />
          <Row label="Engagement Manager" value={consultant.em} />
          <Row
            label="Current engagement"
            value={
              consultant.currentAllocation === 0 ? (
                <span className="font-semibold text-state-danger">On bench</span>
              ) : (
                consultant.currentEngagement
              )
            }
          />
          <Row label="End date" value={formatDate(consultant.endDate)} />
        </Panel>

        <Panel>
          <PanelTitle>Availability</PanelTitle>
          <Row
            label="Free this week"
            value={<CapacityBar available={consultant.availableNow} />}
          />
          <Row
            label="Free next 6 months"
            value={<CapacityBar available={consultant.availabilityNext6m} />}
          />
          <Row
            label="Current allocation"
            value={`${Math.round(consultant.currentAllocation * 100)}%`}
          />
          <Row label="Allocation plan" value="" />
          <p className="mt-1 whitespace-pre-line text-xs text-ey-gray">
            {consultant.allocationText}
          </p>
        </Panel>

        <Panel>
          <PanelTitle>Skills</PanelTitle>
          <Row
            label="Primary skillset"
            value={
              <span className="font-semibold text-ey-black">
                {(consultant.skills ?? []).join(", ") || consultant.skillsetTools}
              </span>
            }
          />
          <div className="mb-2 mt-1 flex flex-wrap gap-1.5">
            {(consultant.skills ?? []).map((skill) => (
              <span
                key={skill}
                className="rounded-sm border border-ey-gray/30 bg-ey-yellow/20 px-1.5 py-0.5 text-[11px] text-ey-ink"
              >
                {skill}
              </span>
            ))}
          </div>
          <Row label="Secondary" value={consultant.secondarySkill} />
          <div className="mt-2 flex items-center gap-2 text-sm text-ey-ink">
            <Briefcase size={14} className="text-ey-gray" />
            {consultant.previousRoles}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-ey-ink">
            <Target size={14} className="text-ey-gray" />
            Aspiring: {consultant.aspiringRoles}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle>Weekly Allocation Forecast (% booked)</PanelTitle>
        <ChartBar data={weekly} />
      </Panel>

      <Panel>
        <PanelTitle>Experience</PanelTitle>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ey-ink">
          {consultant.experienceCV}
        </p>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <PanelTitle>
            <span className="inline-flex items-center gap-1.5">
              <Tags size={13} /> AI Skill Tags
            </span>
          </PanelTitle>
          <button className="btn-ghost" onClick={runAutoTag} disabled={tagsBusy}>
            <Tags size={13} /> {tagsBusy ? "Extracting..." : "Auto-tag from CV"}
          </button>
        </div>

        {tagsErr && <p className="text-sm text-state-danger">{tagsErr}</p>}

        {!tags && !tagsBusy && !tagsErr && (
          <p className="text-sm text-ey-gray">
            Extract normalised skills, tools, industries and strengths from this
            consultant&apos;s CV.
          </p>
        )}

        {tags && (
          <div className="space-y-3">
            {(
              [
                ["Skills", tags.skills, "yellow"],
                ["Tools", tags.tools, "ink"],
                ["Industries", tags.industries, "gray"],
                ["Strengths", tags.strengths, "success"],
              ] as const
            )
              .filter(([, items]) => items.length > 0)
              .map(([label, items, tone]) => (
                <div key={label}>
                  <div className="mb-1.5 text-xs uppercase tracking-wider text-ey-gray">
                    {label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((t) => (
                      <Chip key={t} color={tone}>
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelTitle>Advance Bookings</PanelTitle>
        {bookings.length === 0 ? (
          <p className="text-sm text-ey-gray">
            No advance bookings for this resource yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded border border-ey-gray-100 bg-ey-offwhite p-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-ey-black">{b.engagement}</div>
                  <div className="text-xs text-ey-gray">
                    <Flag size={12} className="mr-1 inline" />
                    {formatDate(b.startDate)} - {formatDate(b.endDate)} · EM{" "}
                    {b.em}
                  </div>
                </div>
                <Chip color="yellow">{b.allocationPct}%</Chip>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <BookingModal
        consultant={consultant}
        open={open}
        onClose={() => setOpen(false)}
        onBooked={() => setTimeout(() => setOpen(false), 1200)}
      />
    </div>
  );
}
