import { z } from "zod";
import { payrollSchemeSchema } from "./common";

export const teacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  privateRate45: z.number().nonnegative(),
  privatePayroll: payrollSchemeSchema,
  groupPayroll: payrollSchemeSchema,
});
export type Teacher = z.infer<typeof teacherSchema>;

export const settingsSchema = z.object({
  familyDiscount: z.number().min(0).max(1),
  baseLessonMinutes: z.number().positive(),
  currency: z.string(),
  teachers: z.array(teacherSchema),
  halls: z.array(z.string()),
  directions: z.array(z.string()),
  levels: z.array(z.string()),
  sources: z.array(z.string()),
  otherCategories: z.array(z.string()),
});
export type Settings = z.infer<typeof settingsSchema>;
