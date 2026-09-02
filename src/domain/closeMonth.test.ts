import { describe, expect, it } from "vitest";
import { closeMonth } from "./closeMonth";
import type { Settings } from "@/schemas/settings";
import type { Client } from "@/schemas/client";
import type { Student } from "@/schemas/student";
import type { Group } from "@/schemas/group";
import type { Enrollment } from "@/schemas/enrollment";
import type { AttendanceMonth } from "@/schemas/attendanceMonth";

const settings: Settings = {
  familyDiscount: 0.1,
  baseLessonMinutes: 45,
  currency: "ILS",
  teachers: [],
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

const group: Group = {
  id: "G-1",
  name: "Группа",
  direction: "",
  level: "",
  teacherId: "T-1",
  days: ["Tue", "Thu"],
  startTime: "17:00",
  endTime: "18:00",
  hall: "",
  capacity: 14,
  billing: "monthly",
  monthlyPrice: 280,
  lessonPrice: 40,
  active: true,
};

const today = new Date(2026, 8, 15); // 2026-09-15, after the charged month

function makeStudent(overrides: Partial<Student>): Student {
  return {
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
    ...overrides,
  };
}

function makeEnrollment(overrides: Partial<Enrollment>): Enrollment {
  return { id: "E-1", studentId: "S-1", groupId: "G-1", startedAt: "2026-01-01", endedAt: null, ...overrides };
}

function attendanceWith(sessions: AttendanceMonth["sessions"]): AttendanceMonth {
  return { month: "2026-08", sessions };
}

describe("closeMonth", () => {
  it("charges full price with no discount for a single-child family", () => {
    const student = makeStudent({});
    const enrollment = makeEnrollment({});
    const attendance = attendanceWith([
      { id: "S-1", date: "2026-08-04", groupId: "G-1", teacherId: "T-1", marks: { "S-1": "present" }, recordedBy: "x", recordedAt: "" },
    ]);

    const charges = closeMonth({
      month: "2026-08",
      today,
      enrollments: [enrollment],
      groups: [group],
      students: [student],
      clients: [client],
      settings,
      attendance,
      existingCharges: [],
    });

    expect(charges).toEqual([
      {
        enrollmentId: "E-1",
        studentId: "S-1",
        groupId: "G-1",
        held: 1,
        went: 1,
        missed: 0,
        base: 280,
        discount: 0,
        charge: 280,
        manualOverride: null,
        computedAt: today.toISOString(),
      },
    ]);
  });

  it("produces no entry at all for a month with zero sessions held", () => {
    const student = makeStudent({});
    const enrollment = makeEnrollment({});

    const charges = closeMonth({
      month: "2026-08",
      today,
      enrollments: [enrollment],
      groups: [group],
      students: [student],
      clients: [client],
      settings,
      attendance: null,
      existingCharges: [],
    });

    expect(charges).toEqual([]);
  });

  it("keeps a manualOverride across recompute, but still refreshes held/went/base", () => {
    const student = makeStudent({});
    const enrollment = makeEnrollment({});
    const attendance = attendanceWith([
      { id: "S-1", date: "2026-08-04", groupId: "G-1", teacherId: "T-1", marks: { "S-1": "absent" }, recordedBy: "x", recordedAt: "" },
    ]);

    const charges = closeMonth({
      month: "2026-08",
      today,
      enrollments: [enrollment],
      groups: [group],
      students: [student],
      clients: [client],
      settings,
      attendance,
      existingCharges: [
        {
          enrollmentId: "E-1",
          studentId: "S-1",
          groupId: "G-1",
          held: 0,
          went: 0,
          missed: 0,
          base: 0,
          discount: 0,
          charge: 150,
          manualOverride: 150,
          computedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    expect(charges[0]).toMatchObject({ held: 1, went: 0, missed: 1, base: 240, manualOverride: 150, charge: 150 });
  });

  it("applies the family discount only to the sibling who did not start earliest", () => {
    const older = makeStudent({ id: "S-1", startedAt: "2026-01-01" });
    const younger = makeStudent({ id: "S-2", startedAt: "2026-02-01" });
    const enrollmentOlder = makeEnrollment({ id: "E-1", studentId: "S-1" });
    const enrollmentYounger = makeEnrollment({ id: "E-2", studentId: "S-2" });
    const attendance = attendanceWith([
      {
        id: "S-1",
        date: "2026-08-04",
        groupId: "G-1",
        teacherId: "T-1",
        marks: { "S-1": "present", "S-2": "present" },
        recordedBy: "x",
        recordedAt: "",
      },
    ]);

    const charges = closeMonth({
      month: "2026-08",
      today,
      enrollments: [enrollmentOlder, enrollmentYounger],
      groups: [group],
      students: [older, younger],
      clients: [client],
      settings,
      attendance,
      existingCharges: [],
    });

    const olderCharge = charges.find((c) => c.studentId === "S-1")!;
    const youngerCharge = charges.find((c) => c.studentId === "S-2")!;
    expect(olderCharge).toMatchObject({ discount: 0, charge: 280 });
    expect(youngerCharge).toMatchObject({ discount: 0.1, charge: 252 });
  });
});
