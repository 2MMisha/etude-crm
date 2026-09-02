import { z } from "zod";
import { isoTimestampSchema, monthStringSchema } from "./common";

/**
 * One computed group charge per active enrollment for the month.
 * Written only by close-month.yml (§5.1) — `manualOverride`, once set, survives recompute.
 */
export const chargeSchema = z.object({
  enrollmentId: z.string(),
  studentId: z.string(),
  groupId: z.string(),
  held: z.number().int().nonnegative(),
  went: z.number().int().nonnegative(),
  missed: z.number().int().nonnegative(),
  base: z.number().nonnegative(),
  discount: z.number().min(0).max(1),
  /** round(base * (1 - discount)), or the override below if set. */
  charge: z.number().nonnegative(),
  manualOverride: z.number().nonnegative().nullable(),
  computedAt: isoTimestampSchema,
});
export type Charge = z.infer<typeof chargeSchema>;

export const chargesMonthSchema = z.object({
  month: monthStringSchema,
  charges: z.array(chargeSchema),
});
export type ChargesMonth = z.infer<typeof chargesMonthSchema>;
