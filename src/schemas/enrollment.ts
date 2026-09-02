import { z } from "zod";
import { dateStringSchema } from "./common";

export const enrollmentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  groupId: z.string(),
  startedAt: dateStringSchema,
  /** null = enrollment is currently active. */
  endedAt: dateStringSchema.nullable(),
});
export type Enrollment = z.infer<typeof enrollmentSchema>;
