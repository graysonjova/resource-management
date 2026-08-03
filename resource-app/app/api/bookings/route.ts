import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { checkConflict } from "@/lib/availability";
import { readBookings, writeBookings } from "@/lib/bookingsStore";
import { getConsultantById } from "@/lib/data";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const consultantId = searchParams.get("consultantId");
  let bookings = readBookings();
  if (consultantId) {
    bookings = bookings.filter((b) => b.consultantId === consultantId);
  }
  return NextResponse.json(bookings);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { consultantId, engagement, em, startDate, endDate, note } = body;
  const allocationPct = Number(body.allocationPct);

  if (!consultantId || !engagement || !startDate || !endDate) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(allocationPct) || allocationPct <= 0 || allocationPct > 100) {
    return NextResponse.json(
      { ok: false, message: "Allocation % must be between 1 and 100." },
      { status: 400 },
    );
  }
  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json(
      { ok: false, message: "End date must be after start date." },
      { status: 400 },
    );
  }

  const consultant = getConsultantById(consultantId);
  if (!consultant) {
    return NextResponse.json(
      { ok: false, message: "Consultant not found." },
      { status: 404 },
    );
  }

  const existing = readBookings();
  const conflict = checkConflict(consultant, existing, {
    startDate,
    endDate,
    allocationPct,
  });

  if (!conflict.ok) {
    return NextResponse.json(
      { ok: false, message: conflict.message, conflict },
      { status: 409 },
    );
  }

  const booking: Booking = {
    id: randomUUID(),
    consultantId,
    consultantName: consultant.name,
    engagement,
    em: em || consultant.em,
    startDate,
    endDate,
    allocationPct,
    note: note || undefined,
    createdAt: new Date().toISOString(),
  };

  existing.push(booking);
  writeBookings(existing);

  return NextResponse.json({
    ok: true,
    message: `Booked ${consultant.name} at ${allocationPct}% (${conflict.message})`,
    booking,
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Missing booking id." },
      { status: 400 },
    );
  }
  const remaining = readBookings().filter((b) => b.id !== id);
  writeBookings(remaining);
  return NextResponse.json({ ok: true });
}
