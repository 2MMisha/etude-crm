import type { Group } from "@/schemas/group";

const WEEKDAY_CODES: Group["days"] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayDateString(): string {
  return toDateString(new Date());
}

/** "YYYY-MM-DD" -> "YYYY-MM" */
export function monthOf(dateString: string): string {
  return dateString.slice(0, 7);
}

/** "YYYY-MM-DD" -> weekday code, parsed as local calendar date (no timezone drift). */
export function weekdayCodeOf(dateString: string): Group["days"][number] {
  const [y, m, d] = dateString.split("-").map(Number);
  return WEEKDAY_CODES[new Date(y, m - 1, d).getDay()];
}

/** §3 attendance session id convention: "S-YYYYMMDD-<groupId>". */
export function sessionId(date: string, groupId: string): string {
  return `S-${date.replace(/-/g, "")}-${groupId}`;
}
