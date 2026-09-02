import { describe, expect, it } from "vitest";
import { recalcBalances } from "./recalcBalances";
import type { Settings } from "@/schemas/settings";
import type { Client } from "@/schemas/client";
import type { Student } from "@/schemas/student";

const settings: Settings = {
  familyDiscount: 0.1,
  baseLessonMinutes: 45,
  currency: "ILS",
  teachers: [{ id: "T-1", name: "Педагог", privateRate45: 250, privatePayroll: { scheme: "percent", value: 0.5 }, groupPayroll: { scheme: "perLesson", value: 120 } }],
  halls: [],
  directions: [],
  levels: [],
  sources: [],
  otherCategories: [],
};

const client: Client = {
  id: "K-1",
  name: "Родитель",
  phone: "",
  email: "",
  type: "parent",
  status: "active",
  specialDiscount: 0,
  source: "",
  registeredAt: "2026-01-01",
  notes: "",
};

const student: Student = {
  id: "S-1",
  clientId: "K-1",
  name: "Ученик",
  birthDate: "2019-01-01",
  sex: "F",
  partnerId: null,
  startedAt: "2026-01-01",
  status: "active",
  specialDiscount: 0,
  healthDeclaration: true,
  photoConsent: true,
  notes: "",
};

describe("recalcBalances", () => {
  it("nets cash, group charges, and lesson charges for the client's family", () => {
    const result = recalcBalances({
      computedAt: "2026-09-01T00:00:00.000Z",
      clients: [client],
      students: [student],
      settings,
      cashMonths: [{ month: "2026-08", operations: [{ id: "O-1", date: "2026-08-01", clientId: "K-1", type: "topup", category: null, amount: 1000, method: "cash", docNumber: "", notes: "" }] }],
      chargesMonths: [{ month: "2026-08", charges: [{ enrollmentId: "E-1", studentId: "S-1", groupId: "G-1", held: 8, went: 8, missed: 0, base: 280, discount: 0, charge: 280, manualOverride: null, computedAt: "" }] }],
      lessonsMonths: [{ month: "2026-08", lessons: [{ id: "L-1", date: "2026-08-05", teacherId: "T-1", minutes: 45, status: "held", participants: [{ studentId: "S-1", share: 1 }], notes: "" }] }],
    });

    expect(result.balances).toEqual([{ clientId: "K-1", balance: 1000 - 280 - 250, cashTotal: 1000, groupChargesTotal: 280, lessonChargesTotal: 250 }]);
  });

  it("does not charge for a cancelled-in-time lesson", () => {
    const result = recalcBalances({
      computedAt: "2026-09-01T00:00:00.000Z",
      clients: [client],
      students: [student],
      settings,
      cashMonths: [],
      chargesMonths: [],
      lessonsMonths: [{ month: "2026-08", lessons: [{ id: "L-1", date: "2026-08-05", teacherId: "T-1", minutes: 45, status: "cancelledInTime", participants: [{ studentId: "S-1", share: 1 }], notes: "" }] }],
    });

    expect(result.balances[0]).toMatchObject({ lessonChargesTotal: 0, balance: 0 });
  });
});
