import { describe, expect, it } from "vitest";
import { computeGroupPayroll, computeIndividualPayroll, hoursBetween } from "./payroll";

describe("hoursBetween", () => {
  it("computes hours from HH:MM strings", () => {
    expect(hoursBetween("17:00", "18:00")).toBe(1);
    expect(hoursBetween("17:00", "18:30")).toBe(1.5);
  });
});

describe("computeIndividualPayroll", () => {
  it("percent scheme takes a share of lesson revenue", () => {
    const amount = computeIndividualPayroll({
      scheme: { scheme: "percent", value: 0.5 },
      lessonRevenue: 250,
      minutes: 45,
    });
    expect(amount).toBe(125);
  });

  it("perLesson scheme pays a flat amount regardless of revenue", () => {
    const amount = computeIndividualPayroll({
      scheme: { scheme: "perLesson", value: 120 },
      lessonRevenue: 500,
      minutes: 45,
    });
    expect(amount).toBe(120);
  });

  it("perHour scheme scales with lesson duration", () => {
    const amount = computeIndividualPayroll({
      scheme: { scheme: "perHour", value: 100 },
      lessonRevenue: 0,
      minutes: 90,
    });
    expect(amount).toBe(150);
  });
});

describe("computeGroupPayroll", () => {
  it("perLesson scheme multiplies by sessions held", () => {
    const amount = computeGroupPayroll({
      scheme: { scheme: "perLesson", value: 120 },
      sessionsCount: 8,
      totalHours: 8,
      groupChargesTotal: 2000,
    });
    expect(amount).toBe(960);
  });

  it("perHour scheme multiplies by total session hours", () => {
    const amount = computeGroupPayroll({
      scheme: { scheme: "perHour", value: 100 },
      sessionsCount: 8,
      totalHours: 8,
      groupChargesTotal: 2000,
    });
    expect(amount).toBe(800);
  });

  it("percent scheme takes a share of the group's charges for the month", () => {
    const amount = computeGroupPayroll({
      scheme: { scheme: "percent", value: 0.3 },
      sessionsCount: 8,
      totalHours: 8,
      groupChargesTotal: 2000,
    });
    expect(amount).toBe(600);
  });
});
