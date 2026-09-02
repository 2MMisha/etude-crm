import { describe, expect, it } from "vitest";
import { cashOperationSign, computeFamilyBalance } from "./balance";

describe("cashOperationSign", () => {
  it("topup and adjustPlus are positive", () => {
    expect(cashOperationSign("topup")).toBe(1);
    expect(cashOperationSign("adjustPlus")).toBe(1);
  });

  it("refund, otherCharge, and adjustMinus are negative", () => {
    expect(cashOperationSign("refund")).toBe(-1);
    expect(cashOperationSign("otherCharge")).toBe(-1);
    expect(cashOperationSign("adjustMinus")).toBe(-1);
  });
});

describe("computeFamilyBalance", () => {
  it("nets cash movements against group and lesson charges", () => {
    const balance = computeFamilyBalance({
      cashOperations: [
        { type: "topup", amount: 1000 },
        { type: "otherCharge", amount: 50 },
      ],
      groupChargesTotal: 280,
      lessonChargesTotal: 250,
    });
    expect(balance).toBe(1000 - 50 - 280 - 250);
  });

  it("goes negative (debt) with no floor", () => {
    const balance = computeFamilyBalance({
      cashOperations: [{ type: "topup", amount: 100 }],
      groupChargesTotal: 280,
      lessonChargesTotal: 0,
    });
    expect(balance).toBe(-180);
  });
});
