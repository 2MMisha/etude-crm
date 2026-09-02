import { z } from "zod";
import { dateStringSchema, monthStringSchema } from "./common";

export const lessonStatusSchema = z.enum(["held", "lateCancel", "cancelledInTime", "cancelledByStudio"]);

export const lessonParticipantSchema = z.object({
  studentId: z.string(),
  /** Manually-set share of the lesson cost this participant pays. Does not need to sum to 1.0. */
  share: z.number().min(0),
});
export type LessonParticipant = z.infer<typeof lessonParticipantSchema>;

export const lessonSchema = z.object({
  id: z.string(),
  date: dateStringSchema,
  teacherId: z.string(),
  minutes: z.number().positive(),
  status: lessonStatusSchema,
  participants: z.array(lessonParticipantSchema),
  notes: z.string(),
});
export type Lesson = z.infer<typeof lessonSchema>;

export const lessonsMonthSchema = z.object({
  month: monthStringSchema,
  lessons: z.array(lessonSchema),
});
export type LessonsMonth = z.infer<typeof lessonsMonthSchema>;
