import { round } from "./rounding";
import type { z } from "zod";
import type { lessonStatusSchema } from "@/schemas/lessonsMonth";

type LessonStatus = z.infer<typeof lessonStatusSchema>;

/** §4.4 — statuses that actually bill the client. */
export function isLessonChargeable(status: LessonStatus): boolean {
  return status === "held" || status === "lateCancel";
}

export interface LessonCostInput {
  privateRate45: number;
  minutes: number;
  baseLessonMinutes: number;
}

/** §4.4: lessonCost = round(rate45 * minutes / baseLessonMinutes). A zero-rate lesson (trial) costs 0. */
export function computeLessonCost(input: LessonCostInput): number {
  return round((input.privateRate45 * input.minutes) / input.baseLessonMinutes);
}

/** §4.4: chargePerParticipant = round(lessonCost * share). Shares are set manually and need not sum to 1. */
export function computeParticipantCharge(lessonCost: number, share: number): number {
  return round(lessonCost * share);
}
