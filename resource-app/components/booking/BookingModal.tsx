"use client";

import { AlertTriangle, CheckCircle2, CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import type { Consultant } from "@/lib/types";

export function BookingModal({
  consultant,
  open,
  onClose,
  onBooked,
}: {
  consultant: Consultant | null;
  open: boolean;
  onClose: () => void;
  onBooked?: () => void;
}) {
  const [engagement, setEngagement] = useState("");
  const [em, setEm] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [allocationPct, setAllocationPct] = useState(50);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "idle" });

  if (!consultant) return null;

  async function submit() {
    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: consultant!.id,
          engagement,
          em: em || consultant!.em,
          startDate,
          endDate,
          allocationPct,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({
          type: "error",
          message: data?.message || "Booking failed.",
        });
        return;
      }
      setStatus({ type: "success", message: data?.message || "Booked." });
      onBooked?.();
    } catch (e) {
      setStatus({ type: "error", message: (e as Error).message });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Book ${consultant.name}`}>
      <div className="space-y-3">
        <div className="rounded border border-ey-gray-100 bg-ey-offwhite p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ey-gray">Rank</span>
            <span className="text-ey-ink">{consultant.rankAndGrade}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ey-gray">Skillset</span>
            <span className="text-ey-ink">{consultant.skillsetCategory}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ey-gray">Free this week</span>
            <span
              className={
                consultant.availableNow > 0
                  ? "font-semibold text-state-success"
                  : "font-semibold text-state-danger"
              }
            >
              {Math.round(consultant.availableNow * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label className="label">Engagement</label>
          <input
            className="input"
            value={engagement}
            onChange={(e) => setEngagement(e.target.value)}
            placeholder="e.g. Dummy Bank - Data Platform Uplift"
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Allocation %</label>
            <input
              type="number"
              min={1}
              max={100}
              className="input"
              value={allocationPct}
              onChange={(e) => setAllocationPct(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Engagement Manager</label>
            <input
              className="input"
              value={em}
              onChange={(e) => setEm(e.target.value)}
              placeholder={consultant.em}
            />
          </div>
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {status.type === "error" && (
          <div className="flex items-start gap-2 rounded border border-state-danger/40 bg-state-danger/10 p-3 text-sm text-state-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}
        {status.type === "success" && (
          <div className="flex items-start gap-2 rounded border border-state-success/40 bg-state-success/10 p-3 text-sm text-state-success">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary"
            disabled={status.type === "loading" || !engagement}
            onClick={submit}
          >
            <CalendarPlus size={16} />
            {status.type === "loading" ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
