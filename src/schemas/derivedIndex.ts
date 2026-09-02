import { z } from "zod";
import { isoTimestampSchema, monthStringSchema } from "./common";

/**
 * Written only by recalc-balances.yml (§5.2). A cheap lookup table so screens
 * (dashboard, month pickers) don't need to list every shard file individually.
 */
export const derivedIndexSchema = z.object({
  computedAt: isoTimestampSchema,
  months: z.object({
    attendance: z.array(monthStringSchema),
    lessons: z.array(monthStringSchema),
    cash: z.array(monthStringSchema),
    charges: z.array(monthStringSchema),
    payroll: z.array(monthStringSchema),
  }),
  counts: z.object({
    clients: z.number().int().nonnegative(),
    students: z.number().int().nonnegative(),
    groups: z.number().int().nonnegative(),
    activeEnrollments: z.number().int().nonnegative(),
  }),
});
export type DerivedIndex = z.infer<typeof derivedIndexSchema>;
