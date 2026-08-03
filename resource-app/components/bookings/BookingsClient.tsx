"use client";

import { CalendarCheck, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Chip, Panel } from "@/components/ui/kit";
import { formatDate } from "@/lib/format";
import type { Booking } from "@/lib/types";

export function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function cancel(id: string) {
    setBusy(id);
    await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setBusy(null);
    router.refresh();
  }

  const sorted = [...bookings].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ey-black">
          Advance bookings
        </h1>
        <p className="mt-1 text-sm text-ey-gray">
          {bookings.length} reservation{bookings.length === 1 ? "" : "s"} placed
          by engagement managers.
        </p>
      </div>

      {sorted.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 py-12 text-center">
          <CalendarCheck size={32} className="text-ey-gray-200" />
          <p className="text-ey-gray">
            No bookings yet. Reserve a resource from the roster or a profile.
          </p>
          <Link href="/resources" className="btn-primary mt-2">
            Go to roster
          </Link>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sorted.map((b) => (
            <Panel key={b.id} hover className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ey-black">
                    {b.engagement}
                  </h3>
                  <Link
                    href={`/resources/${b.consultantId}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm text-ey-ink hover:underline"
                  >
                    <User size={14} /> {b.consultantName}
                  </Link>
                </div>
                <Chip color="yellow">{b.allocationPct}%</Chip>
              </div>
              <div className="text-xs text-ey-gray">
                {formatDate(b.startDate)} - {formatDate(b.endDate)} · EM {b.em}
              </div>
              {b.note && (
                <p className="text-xs italic text-ey-gray">&ldquo;{b.note}&rdquo;</p>
              )}
              <div className="flex justify-end">
                <button
                  className="btn-ghost px-3 py-1.5 text-xs hover:border-state-danger hover:text-state-danger"
                  disabled={busy === b.id}
                  onClick={() => cancel(b.id)}
                >
                  <Trash2 size={14} />
                  {busy === b.id ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
