import type { CashMonth, CashOperation } from "@/schemas/cashMonth";
import type { ChargesMonth } from "@/schemas/chargesMonth";
import type { Client } from "@/schemas/client";
import type { DerivedBalances } from "@/schemas/derivedBalances";
import type { LessonsMonth } from "@/schemas/lessonsMonth";
import type { Settings } from "@/schemas/settings";
import type { Student } from "@/schemas/student";
import { cashOperationSign, computeFamilyBalance } from "./balance";
import { computeLessonCost, computeParticipantCharge, isLessonChargeable } from "./lessonCharge";

export interface RecalcBalancesInput {
  computedAt: string;
  clients: Client[];
  students: Student[];
  settings: Settings;
  cashMonths: CashMonth[];
  chargesMonths: ChargesMonth[];
  lessonsMonths: LessonsMonth[];
}

/**
 * recalc-balances.yml equivalent (§5.2), run client-side after any write
 * that could move a balance. Walks every month on file — fine at this
 * studio's scale (§1) — rather than requiring a separate running total.
 */
export function recalcBalances(input: RecalcBalancesInput): DerivedBalances {
  const { computedAt, clients, students, settings, cashMonths, chargesMonths, lessonsMonths } = input;

  const clientIdByStudentId = new Map(students.map((s) => [s.id, s.clientId]));
  const teacherRateById = new Map(settings.teachers.map((t) => [t.id, t.privateRate45]));

  const groupChargeByClientId = new Map<string, number>();
  for (const month of chargesMonths) {
    for (const charge of month.charges) {
      const clientId = clientIdByStudentId.get(charge.studentId);
      if (!clientId) continue;
      groupChargeByClientId.set(clientId, (groupChargeByClientId.get(clientId) ?? 0) + charge.charge);
    }
  }

  const lessonChargeByClientId = new Map<string, number>();
  for (const month of lessonsMonths) {
    for (const lesson of month.lessons) {
      if (!isLessonChargeable(lesson.status)) continue;
      const rate = teacherRateById.get(lesson.teacherId) ?? 0;
      const lessonCost = computeLessonCost({ privateRate45: rate, minutes: lesson.minutes, baseLessonMinutes: settings.baseLessonMinutes });
      for (const participant of lesson.participants) {
        const clientId = clientIdByStudentId.get(participant.studentId);
        if (!clientId) continue;
        const charge = computeParticipantCharge(lessonCost, participant.share);
        lessonChargeByClientId.set(clientId, (lessonChargeByClientId.get(clientId) ?? 0) + charge);
      }
    }
  }

  const cashByClientId = new Map<string, CashOperation[]>();
  for (const month of cashMonths) {
    for (const op of month.operations) {
      const list = cashByClientId.get(op.clientId) ?? [];
      list.push(op);
      cashByClientId.set(op.clientId, list);
    }
  }

  const balances = clients.map((client) => {
    const cashOperations = cashByClientId.get(client.id) ?? [];
    const cashTotal = cashOperations.reduce((sum, op) => sum + cashOperationSign(op.type) * op.amount, 0);
    const groupChargesTotal = groupChargeByClientId.get(client.id) ?? 0;
    const lessonChargesTotal = lessonChargeByClientId.get(client.id) ?? 0;
    const balance = computeFamilyBalance({ cashOperations, groupChargesTotal, lessonChargesTotal });
    return { clientId: client.id, balance, cashTotal, groupChargesTotal, lessonChargesTotal };
  });

  return { computedAt, balances };
}
