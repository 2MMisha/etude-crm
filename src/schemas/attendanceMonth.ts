import { z } from "zod";
import { dateStringSchema, isoTimestampSchema, monthStringSchema } from "./common";

export const attendanceMarkSchema = z.enum(["present", "absent", "makeup", "cancelledByStudio"]);

export const attendanceSessionSchema = z.object({
  id: z.string(),
  date: dateStringSchema,
  groupId: z.string(),
  teacherId: z.string(),
  /** studentId -> mark */
  marks: z.record(z.string(), attendanceMarkSchema),
  recordedBy: z.string(),
  recordedAt: isoTimestampSchema,
});
export type AttendanceSession = z.infer<typeof attendanceSessionSchema>;

export const attendanceMonthSchema = z.object({
  month: monthStringSchema,
  sessions: z.array(attendanceSessionSchema),
});
export type AttendanceMonth = z.infer<typeof attendanceMonthSchema>;
