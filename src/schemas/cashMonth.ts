import { z } from "zod";
import { dateStringSchema, monthStringSchema } from "./common";

export const cashOperationTypeSchema = z.enum(["topup", "refund", "otherCharge", "adjustPlus", "adjustMinus"]);
export type CashOperationType = z.infer<typeof cashOperationTypeSchema>;

export const cashOperationSchema = z.object({
  id: z.string(),
  date: dateStringSchema,
  clientId: z.string(),
  type: cashOperationTypeSchema,
  /** Set for "otherCharge" — one of settings.otherCategories; null otherwise. */
  category: z.string().nullable(),
  /** Always positive; sign is derived from `type`. */
  amount: z.number().positive(),
  method: z.string(),
  docNumber: z.string(),
  notes: z.string(),
});
export type CashOperation = z.infer<typeof cashOperationSchema>;

export const cashMonthSchema = z.object({
  month: monthStringSchema,
  operations: z.array(cashOperationSchema),
});
export type CashMonth = z.infer<typeof cashMonthSchema>;
