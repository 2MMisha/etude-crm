import { describe, expect, it } from "vitest";
import { computeGroupCharge } from "./groupCharge";

const baseInput = {
  month: "2026-03",
  today: new Date(2026, 8, 1), // 2026-09-01, well after the charged month
  enrollment: { startedAt: "2026-01-15", endedAt: null as string | null },
  billing: "monthly" as const,
  monthlyPrice: 280,
  lessonPrice: 40,
  heldSessions: 8,
  wentSessions: 8,
  discount: 0,
};

describe("computeGroupCharge — guards", () => {
  it("does not charge a month that has not started yet", () => {
    const result = computeGroupCharge({ ...baseInput, month: "2026-12", today: new Date(2026, 8, 1) });
    expect(result).toEqual({ charged: false, reason: "monthNotStarted" });
  });

  it("does not charge when the enrollment starts after the month ends", () => {
    const result = computeGroupCharge({
      ...baseInput,
      month: "2026-01",
      enrollment: { startedAt: "2026-02-01", endedAt: null },
    });
    expect(result).toEqual({ charged: false, reason: "enrollmentNotActive" });
  });

  it("does not charge when the enrollment ended before the month starts", () => {
    const result = computeGroupCharge({
      ...baseInput,
      month: "2026-03",
      enrollment: { startedAt: "2026-01-01", endedAt: "2026-02-15" },
    });
    expect(result).toEqual({ charged: false, reason: "enrollmentNotActive" });
  });

  it("does not charge a month with zero sessions held — the critical guard against phantom debt", () => {
    const result = computeGroupCharge({ ...baseInput, heldSessions: 0, wentSessions: 0 });
    expect(result).toEqual({ charged: false, reason: "noSessionsHeld" });
  });
});

describe("computeGroupCharge — monthly billing", () => {
  it("charges full price with no absences", () => {
    const result = computeGroupCharge(baseInput);
    expect(result).toEqual({ charged: true, missed: 0, base: 280, charge: 280 });
  });

  it("deducts every absence at lessonPrice, regardless of cause", () => {
    const result = computeGroupCharge({ ...baseInput, heldSessions: 8, wentSessions: 6 });
    // missed = 2, base = 280 - 2*40 = 200
    expect(result).toEqual({ charged: true, missed: 2, base: 200, charge: 200 });
  });

  it("never goes below zero even if absences exceed the monthly price", () => {
    const result = computeGroupCharge({ ...baseInput, monthlyPrice: 50, heldSessions: 8, wentSessions: 0 });
    expect(result).toMatchObject({ charged: true, base: 0, charge: 0 });
  });

  it("applies the resolved discount after absence deduction", () => {
    const result = computeGroupCharge({ ...baseInput, discount: 0.1 });
    // base 280, charge = round(280 * 0.9) = 252
    expect(result).toEqual({ charged: true, missed: 0, base: 280, charge: 252 });
  });
});

describe("computeGroupCharge — perLesson billing", () => {
  it("charges only for sessions attended", () => {
    const result = computeGroupCharge({
      ...baseInput,
      billing: "perLesson",
      monthlyPrice: 0,
      heldSessions: 8,
      wentSessions: 5,
    });
    expect(result).toEqual({ charged: true, missed: 3, base: 200, charge: 200 });
  });
});
