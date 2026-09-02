import { describe, expect, it } from "vitest";
import { familyDiscountEligibility, resolveGroupDiscount } from "./discount";

describe("familyDiscountEligibility", () => {
  it("excludes the earliest-started student from the family discount", () => {
    const result = familyDiscountEligibility([
      { studentId: "U-1", startedAt: "2025-01-01" },
      { studentId: "U-2", startedAt: "2025-06-01" },
    ]);
    expect(result.get("U-1")).toBe(false);
    expect(result.get("U-2")).toBe(true);
  });

  it("excludes both students when startedAt is tied at the earliest date", () => {
    const result = familyDiscountEligibility([
      { studentId: "U-1", startedAt: "2025-01-01" },
      { studentId: "U-2", startedAt: "2025-01-01" },
    ]);
    expect(result.get("U-1")).toBe(false);
    expect(result.get("U-2")).toBe(false);
  });

  it("a lone child in the family is the earliest and gets no family discount", () => {
    const result = familyDiscountEligibility([{ studentId: "U-1", startedAt: "2025-01-01" }]);
    expect(result.get("U-1")).toBe(false);
  });
});

describe("resolveGroupDiscount", () => {
  it("takes the largest of the three rates, never the sum", () => {
    const rate = resolveGroupDiscount({
      familyDiscountRate: 0.1,
      eligibleForFamilyDiscount: true,
      clientSpecialDiscount: 0.15,
      studentSpecialDiscount: 0.05,
    });
    expect(rate).toBe(0.15);
  });

  it("family discount does not apply when the student is not eligible", () => {
    const rate = resolveGroupDiscount({
      familyDiscountRate: 0.1,
      eligibleForFamilyDiscount: false,
      clientSpecialDiscount: 0,
      studentSpecialDiscount: 0,
    });
    expect(rate).toBe(0);
  });
});
