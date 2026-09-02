import { describe, expect, it } from "vitest";
import { isEnrollmentActiveOn } from "./enrollment";

describe("isEnrollmentActiveOn", () => {
  it("is active once started, with no end date", () => {
    const e = { id: "E-1", studentId: "S-1", groupId: "G-1", startedAt: "2026-01-15", endedAt: null };
    expect(isEnrollmentActiveOn(e, "2026-01-15")).toBe(true);
    expect(isEnrollmentActiveOn(e, "2026-06-01")).toBe(true);
    expect(isEnrollmentActiveOn(e, "2026-01-14")).toBe(false);
  });

  it("stops being active the day after it ends, inclusive of the end date itself", () => {
    const e = { id: "E-1", studentId: "S-1", groupId: "G-1", startedAt: "2026-01-01", endedAt: "2026-02-15" };
    expect(isEnrollmentActiveOn(e, "2026-02-15")).toBe(true);
    expect(isEnrollmentActiveOn(e, "2026-02-16")).toBe(false);
  });
});
