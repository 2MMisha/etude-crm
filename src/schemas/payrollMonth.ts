import { z } from "zod";
import { dateStringSchema, isoTimestampSchema, monthStringSchema } from "./common";

export const payrollSourceSchema = z.enum(["individual", "group"]);

/** One accrual line — one lesson, or one group-for-month, per §4.5. */
export const payrollAccrualSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  source: payrollSourceSchema,
  /** lessonId for source="individual", groupId for source="group". */
  refId: z.string(),
  amount: z.number().nonnegative(),
  computedAt: isoTimestampSchema,
});
export type PayrollAccrual = z.infer<typeof payrollAccrualSchema>;

/** Manual entry made by the admin when money actually goes out. */
export const payrollPayoutSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  date: dateStringSchema,
  amount: z.number().positive(),
  notes: z.string(),
  recordedBy: z.string(),
});
export type PayrollPayout = z.infer<typeof payrollPayoutSchema>;

export const payrollMonthSchema = z.object({
  month: monthStringSchema,
  accruals: z.array(payrollAccrualSchema),
  payouts: z.array(payrollPayoutSchema),
});
export type PayrollMonth = z.infer<typeof payrollMonthSchema>;
