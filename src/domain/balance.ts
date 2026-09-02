import type { z } from "zod";
import type { cashOperationTypeSchema } from "@/schemas/cashMonth";

type CashOperationType = z.infer<typeof cashOperationTypeSchema>;

/** §3 cash schema: `amount` is always positive; sign comes from `type`. */
export function cashOperationSign(type: CashOperationType): 1 | -1 {
  return type === "topup" || type === "adjustPlus" ? 1 : -1;
}

export interface FamilyBalanceInput {
  cashOperations: Array<{ type: CashOperationType; amount: number }>;
  /** Sum of all group charges (post-discount) across every student in the family. */
  groupChargesTotal: number;
  /** Sum of all individual-lesson charges across every student in the family. */
  lessonChargesTotal: number;
}

/**
 * §4.1 — family balance. A negative result is a debt; there is no floor.
 * The whole family shares one balance, so this takes totals for the family, not one client.
 */
export function computeFamilyBalance(input: FamilyBalanceInput): number {
  const cashTotal = input.cashOperations.reduce(
    (sum, op) => sum + cashOperationSign(op.type) * op.amount,
    0,
  );
  return cashTotal - input.groupChargesTotal - input.lessonChargesTotal;
}
