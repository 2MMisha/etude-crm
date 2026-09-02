import { round } from "./rounding";
import type { PayrollScheme } from "@/schemas/common";

/** "17:00" / "18:00" -> 1 (hours). Used for group perHour payroll. */
export function hoursBetween(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return (endH * 60 + endM - (startH * 60 + startM)) / 60;
}

export interface IndividualPayrollInput {
  scheme: PayrollScheme;
  /** Total charge for the lesson (before any per-participant split), i.e. "выручка урока". */
  lessonRevenue: number;
  minutes: number;
}

/** §4.5 individual — same chargeable statuses as the client charge (held/lateCancel); caller filters that. */
export function computeIndividualPayroll(input: IndividualPayrollInput): number {
  const { scheme, value } = input.scheme;
  switch (scheme) {
    case "percent":
      return round(input.lessonRevenue * value);
    case "perLesson":
      return round(value);
    case "perHour":
      return round(value * (input.minutes / 60));
  }
}

export interface GroupPayrollInput {
  scheme: PayrollScheme;
  /** Number of sessions held for this teacher's group(s) this month. */
  sessionsCount: number;
  /** Sum of session durations in hours. */
  totalHours: number;
  /** Sum of group charges (post-discount) for this teacher's group(s) this month. */
  groupChargesTotal: number;
}

/** §4.5 group — driven by attendance sessions actually held, not by enrollment. */
export function computeGroupPayroll(input: GroupPayrollInput): number {
  const { scheme, value } = input.scheme;
  switch (scheme) {
    case "perLesson":
      return round(value * input.sessionsCount);
    case "perHour":
      return round(value * input.totalHours);
    case "percent":
      return round(value * input.groupChargesTotal);
  }
}
