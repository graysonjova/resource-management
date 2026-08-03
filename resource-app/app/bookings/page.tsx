import { BookingsClient } from "@/components/bookings/BookingsClient";
import { readBookings } from "@/lib/bookingsStore";

export const dynamic = "force-dynamic";

export default function BookingsPage() {
  const bookings = readBookings();
  return <BookingsClient bookings={bookings} />;
}
