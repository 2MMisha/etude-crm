import type { Enrollment } from "@/schemas/enrollment";

/** Was this enrollment in effect on the given date ("YYYY-MM-DD")? Shared by attendance and §4.2 group charges. */
export function isEnrollmentActiveOn(enrollment: Enrollment, date: string): boolean {
  return enrollment.startedAt <= date && (enrollment.endedAt === null || enrollment.endedAt >= date);
}
