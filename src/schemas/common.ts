import { z } from "zod";

/** Calendar date, "YYYY-MM-DD". */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ожидается дата в формате YYYY-MM-DD");

/** Month shard key, "YYYY-MM". */
export const monthStringSchema = z.string().regex(/^\d{4}-\d{2}$/, "Ожидается месяц в формате YYYY-MM");

/** ISO 8601 timestamp with offset, e.g. recordedAt. */
export const isoTimestampSchema = z.string().datetime({ offset: true });

export const payrollSchemeSchema = z.object({
  scheme: z.enum(["percent", "perLesson", "perHour"]),
  value: z.number(),
});
export type PayrollScheme = z.infer<typeof payrollSchemeSchema>;
