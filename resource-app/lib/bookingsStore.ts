import fs from "node:fs";
import path from "node:path";

import type { Booking } from "./types";

const STORE_PATH = path.resolve(process.cwd(), "data", "bookings.json");

export function readBookings(): Booking[] {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Booking[]) : [];
  } catch {
    return [];
  }
}

export function writeBookings(bookings: Booking[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(bookings, null, 2), "utf-8");
}
