/**
 * §4.3 — discount resolution.
 * Three sources (family / client / student) never stack — the largest wins.
 * Applies only to group charges (§4.3): never to individual lessons or "other" cash categories.
 */

export interface FamilyMember {
  studentId: string;
  startedAt: string; // "YYYY-MM-DD" — lexically comparable
}

/**
 * The student(s) with the earliest `startedAt` in the family are excluded from the
 * family discount. A tie at the earliest date excludes everyone tied at that date —
 * the spec is explicit that both are then treated as "first" and both pay full price.
 */
export function familyDiscountEligibility(members: FamilyMember[]): Map<string, boolean> {
  const eligibility = new Map<string, boolean>();
  if (members.length === 0) return eligibility;

  const earliest = members.reduce((min, m) => (m.startedAt < min ? m.startedAt : min), members[0].startedAt);

  for (const m of members) {
    eligibility.set(m.studentId, m.startedAt !== earliest);
  }
  return eligibility;
}

export interface DiscountInputs {
  familyDiscountRate: number;
  eligibleForFamilyDiscount: boolean;
  clientSpecialDiscount: number;
  studentSpecialDiscount: number;
}

/** Largest of the three applicable rates; never summed. */
export function resolveGroupDiscount(inputs: DiscountInputs): number {
  const familyRate = inputs.eligibleForFamilyDiscount ? inputs.familyDiscountRate : 0;
  return Math.max(familyRate, inputs.clientSpecialDiscount, inputs.studentSpecialDiscount);
}
