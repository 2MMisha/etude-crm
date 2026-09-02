import { describe, expect, it } from "vitest";
import { computeLessonCost, computeParticipantCharge, isLessonChargeable } from "./lessonCharge";

describe("computeLessonCost", () => {
  it("scales the 45-minute rate by lesson length", () => {
    expect(computeLessonCost({ privateRate45: 250, minutes: 45, baseLessonMinutes: 45 })).toBe(250);
    expect(computeLessonCost({ privateRate45: 250, minutes: 60, baseLessonMinutes: 45 })).toBe(333);
  });

  it("a trial lesson at zero rate costs nothing", () => {
    expect(computeLessonCost({ privateRate45: 0, minutes: 45, baseLessonMinutes: 45 })).toBe(0);
  });
});

describe("computeParticipantCharge", () => {
  it("splits evenly when shares are 0.5 / 0.5", () => {
    const cost = 250;
    expect(computeParticipantCharge(cost, 0.5)).toBe(125);
    expect(computeParticipantCharge(cost, 0.5)).toBe(125);
  });

  it("bills only one participant when shares are 1.0 / 0.0", () => {
    const cost = 250;
    expect(computeParticipantCharge(cost, 1.0)).toBe(250);
    expect(computeParticipantCharge(cost, 0.0)).toBe(0);
  });

  it("bills each participant the full rate when shares are 1.0 / 1.0 (each pays full price)", () => {
    const cost = 250;
    expect(computeParticipantCharge(cost, 1.0)).toBe(250);
    expect(computeParticipantCharge(cost, 1.0)).toBe(250);
  });
});

describe("isLessonChargeable", () => {
  it("charges held and lateCancel", () => {
    expect(isLessonChargeable("held")).toBe(true);
    expect(isLessonChargeable("lateCancel")).toBe(true);
  });

  it("does not charge cancelledInTime or cancelledByStudio", () => {
    expect(isLessonChargeable("cancelledInTime")).toBe(false);
    expect(isLessonChargeable("cancelledByStudio")).toBe(false);
  });
});
