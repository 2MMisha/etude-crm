import { describe, expect, it } from "vitest";
import { round } from "./rounding";

describe("round", () => {
  it("rounds to the nearest whole unit", () => {
    expect(round(279.4)).toBe(279);
    expect(round(279.5)).toBe(280);
    expect(round(280)).toBe(280);
  });

  it("corrects float error before rounding (e.g. 0.1 + 0.2 artifacts)", () => {
    expect(round(139.5 + 0.1 - 0.1)).toBe(140);
  });
});
