import type { AttendanceMonth } from "@/schemas/attendanceMonth";
import type { Client } from "@/schemas/client";
import type { Charge } from "@/schemas/chargesMonth";
import type { Enrollment } from "@/schemas/enrollment";
import type { Group } from "@/schemas/group";
import type { Settings } from "@/schemas/settings";
import type { Student } from "@/schemas/student";
import { familyDiscountEligibility, resolveGroupDiscount } from "./discount";
import { computeGroupCharge } from "./groupCharge";

export interface CloseMonthInput {
  month: string;
  today: Date;
  enrollments: Enrollment[];
  groups: Group[];
  students: Student[];
  clients: Client[];
  settings: Settings;
  /** null if no attendance was recorded for the month at all. */
  attendance: AttendanceMonth | null;
  /** Last month's saved charges, if any — manualOverride survives recompute (§5.1 idempotency). */
  existingCharges: Charge[];
}

/**
 * close-month.yml equivalent (§5.1), run client-side by the admin. For each
 * enrollment, recomputes held/went/base/discount fresh from current data but
 * never touches a manualOverride once set. Enrollments the §4.2 guards say
 * not to charge produce no entry at all (not a zero-charge entry) — most
 * importantly the "zero sessions held" guard, without which a subscription
 * would bill months where no class ever ran.
 */
export function closeMonth(input: CloseMonthInput): Charge[] {
  const { month, today, enrollments, groups, students, clients, settings, attendance, existingCharges } = input;

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const studentById = new Map(students.map((s) => [s.id, s]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const overrideByEnrollmentId = new Map(existingCharges.map((c) => [c.enrollmentId, c.manualOverride]));

  const familyEligibilityByClientId = new Map<string, Map<string, boolean>>();
  function eligibilityFor(clientId: string): Map<string, boolean> {
    let map = familyEligibilityByClientId.get(clientId);
    if (!map) {
      const members = students.filter((s) => s.clientId === clientId).map((s) => ({ studentId: s.id, startedAt: s.startedAt }));
      map = familyDiscountEligibility(members);
      familyEligibilityByClientId.set(clientId, map);
    }
    return map;
  }

  const charges: Charge[] = [];
  const computedAt = today.toISOString();

  for (const enrollment of enrollments) {
    const group = groupById.get(enrollment.groupId);
    const student = studentById.get(enrollment.studentId);
    if (!group || !student) continue;

    const client = clientById.get(student.clientId);
    const heldSessions = attendance?.sessions.filter((s) => s.groupId === group.id).length ?? 0;
    const wentSessions =
      attendance?.sessions.filter((s) => s.groupId === group.id && s.marks[student.id] === "present").length ?? 0;

    const discount = resolveGroupDiscount({
      familyDiscountRate: settings.familyDiscount,
      eligibleForFamilyDiscount: eligibilityFor(student.clientId).get(student.id) ?? false,
      clientSpecialDiscount: client?.specialDiscount ?? 0,
      studentSpecialDiscount: student.specialDiscount,
    });

    const result = computeGroupCharge({
      month,
      today,
      enrollment: { startedAt: enrollment.startedAt, endedAt: enrollment.endedAt },
      billing: group.billing,
      monthlyPrice: group.monthlyPrice,
      lessonPrice: group.lessonPrice,
      heldSessions,
      wentSessions,
      discount,
    });
    if (!result.charged) continue;

    const manualOverride = overrideByEnrollmentId.get(enrollment.id) ?? null;
    charges.push({
      enrollmentId: enrollment.id,
      studentId: student.id,
      groupId: group.id,
      held: heldSessions,
      went: wentSessions,
      missed: result.missed,
      base: result.base,
      discount,
      charge: manualOverride ?? result.charge,
      manualOverride,
      computedAt,
    });
  }

  return charges;
}
