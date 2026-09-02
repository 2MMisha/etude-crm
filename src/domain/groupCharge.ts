import { round } from "./rounding";

/** "YYYY-MM" -> ["YYYY-MM-01", "YYYY-MM-<lastDay>"] as comparable date strings. */
function monthBounds(month: string): { start: string; end: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export type GroupChargeSkipReason = "monthNotStarted" | "enrollmentNotActive" | "noSessionsHeld";

export interface GroupChargeInput {
  /** Month being charged, "YYYY-MM". */
  month: string;
  /** Reference "now", injectable for tests — guards against charging a future month. */
  today: Date;
  enrollment: { startedAt: string; endedAt: string | null };
  billing: "monthly" | "perLesson";
  monthlyPrice: number;
  lessonPrice: number;
  /** Sessions held for the group this month (from attendance §3 "held"). */
  heldSessions: number;
  /** "present" count for this student in this group this month. */
  wentSessions: number;
  /** Resolved discount rate 0..1, from resolveGroupDiscount. */
  discount: number;
}

export type GroupChargeResult =
  | { charged: false; reason: GroupChargeSkipReason }
  | { charged: true; missed: number; base: number; charge: number };

/**
 * §4.2 — per-enrollment monthly group charge.
 * All three no-charge guards must be checked, in particular "no sessions held":
 * without it a monthly subscription bills a full year ahead of any class taking place.
 */
export function computeGroupCharge(input: GroupChargeInput): GroupChargeResult {
  const { start, end } = monthBounds(input.month);

  const todayMonth = `${input.today.getFullYear()}-${String(input.today.getMonth() + 1).padStart(2, "0")}`;
  if (input.month > todayMonth) {
    return { charged: false, reason: "monthNotStarted" };
  }

  const { startedAt, endedAt } = input.enrollment;
  const startedInOrBeforeMonth = startedAt <= end;
  const notEndedBeforeMonth = endedAt === null || endedAt >= start;
  if (!startedInOrBeforeMonth || !notEndedBeforeMonth) {
    return { charged: false, reason: "enrollmentNotActive" };
  }

  if (input.heldSessions === 0) {
    return { charged: false, reason: "noSessionsHeld" };
  }

  const missed = Math.max(0, input.heldSessions - input.wentSessions);
  const base =
    input.billing === "monthly"
      ? Math.max(0, input.monthlyPrice - missed * input.lessonPrice)
      : input.wentSessions * input.lessonPrice;
  const charge = round(base * (1 - input.discount));

  return { charged: true, missed, base, charge };
}
