import { groupDisplayName, type CourseGroup } from "@/store/groupsStore";

import type { CourseRow } from "./types";

export type CreditRangeWarning =
  | { type: "empty-required"; groupName: string }
  | { type: "above-max"; minPossible: number; maxCredit: number }
  | { type: "below-min"; maxPossible: number; minCredit: number };

function parseCredit(credit: string): number {
  const parsed = Number(credit);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Only required groups matter here — an optional group can always
 * contribute 0 credits, so it can never be the reason a combination is
 * impossible, only ever a way to add more. Only groups that already have at
 * least one course count toward the credit sums; a required group with zero
 * courses is reported separately since it blocks generation outright
 * (0 candidates for a required slot), independent of credit math.
 *
 * "above-max" is unconditional: even picking the single lowest-credit
 * course in every required group already exceeds the cap, so no choice of
 * optional courses can ever bring it back under.
 *
 * "below-min" is the softer, still-useful case: even picking the
 * highest-credit course in every required group doesn't reach the floor on
 * its own — the user isn't stuck, but they now know they *must* add
 * optional courses to close the gap, not just that they *could*.
 */
export function computeCreditRangeWarning(
  groups: CourseGroup[],
  courseById: Map<number, CourseRow>,
  minCredit: number,
  maxCredit: number
): CreditRangeWarning | null {
  const requiredGroups = groups.filter((g) => g.required);
  if (requiredGroups.length === 0) return null; // nothing required -> no constraint to violate

  const emptyGroup = requiredGroups.find((g) => g.courseIds.length === 0);
  if (emptyGroup) {
    return { type: "empty-required", groupName: groupDisplayName(emptyGroup, groups.indexOf(emptyGroup)) };
  }

  let sumMin = 0;
  let sumMax = 0;
  for (const group of requiredGroups) {
    const credits = group.courseIds
      .map((id) => courseById.get(id))
      .filter((c): c is CourseRow => Boolean(c))
      .map((c) => parseCredit(c.credit));
    if (credits.length === 0) continue;
    sumMin += Math.min(...credits);
    sumMax += Math.max(...credits);
  }

  if (sumMin > maxCredit) {
    return { type: "above-max", minPossible: sumMin, maxCredit };
  }
  if (sumMax < minCredit) {
    return { type: "below-min", maxPossible: sumMax, minCredit };
  }
  return null;
}
