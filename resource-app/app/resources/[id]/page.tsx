import { notFound } from "next/navigation";

import { ProfileClient } from "@/components/resources/ProfileClient";
import { readBookings } from "@/lib/bookingsStore";
import { getConsultantById } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const consultant = getConsultantById(id);
  if (!consultant) notFound();

  const bookings = readBookings().filter((b) => b.consultantId === id);

  return <ProfileClient consultant={consultant} bookings={bookings} />;
}
