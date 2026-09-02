/**
 * Shared money rounding — every `round(...)` in the spec (§4.2, §4.3, §4.4) means this.
 * Rounds to whole currency units (shekels carry no subunits in this system's prices).
 * Corrects for float error (e.g. 1.005) before rounding, since these are wire-format numbers, not Decimal.
 */
export function round(value: number): number {
  return Math.round(value + Number.EPSILON);
}
