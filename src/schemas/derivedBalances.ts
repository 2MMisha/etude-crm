import { z } from "zod";
import { isoTimestampSchema } from "./common";

/** Written only by recalc-balances.yml (§5.2) — the front reads this instead of re-deriving from history. */
export const clientBalanceSchema = z.object({
  clientId: z.string(),
  balance: z.number(),
  cashTotal: z.number(),
  groupChargesTotal: z.number(),
  lessonChargesTotal: z.number(),
});
export type ClientBalance = z.infer<typeof clientBalanceSchema>;

export const derivedBalancesSchema = z.object({
  computedAt: isoTimestampSchema,
  balances: z.array(clientBalanceSchema),
});
export type DerivedBalances = z.infer<typeof derivedBalancesSchema>;
