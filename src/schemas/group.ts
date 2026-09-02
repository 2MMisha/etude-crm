import { z } from "zod";

export const weekdaySchema = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
export const billingSchema = z.enum(["monthly", "perLesson"]);

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  direction: z.string(),
  level: z.string(),
  teacherId: z.string(),
  days: z.array(weekdaySchema),
  startTime: z.string(),
  endTime: z.string(),
  hall: z.string(),
  capacity: z.number().positive(),
  billing: billingSchema,
  monthlyPrice: z.number().nonnegative(),
  /** Required for both billing modes — used to deduct absences even under "monthly". */
  lessonPrice: z.number().nonnegative(),
  active: z.boolean(),
});
export type Group = z.infer<typeof groupSchema>;
