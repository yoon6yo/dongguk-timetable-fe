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

function creditsOf(group: CourseGroup, courseById: Map<number, CourseRow>): number[] {
  return group.courseIds
    .map((id) => courseById.get(id))
    .filter((c): c is CourseRow => Boolean(c))
    .map((c) => parseCredit(c.credit));
}

/**
 * Required groups are the only ones that matter for "above-max": an
 * optional group can always contribute 0 credits, so it can never be the
 * reason a combination exceeds the cap — only required groups' forced
 * minimum can. Only groups that already have at least one course count
 * toward that sum; a required group with zero courses is reported
 * separately since it blocks generation outright (0 candidates for a
 * required slot), independent of credit math.
 *
 * "above-max" is unconditional: even picking the single lowest-credit
 * course in every required group already exceeds the cap, so no choice of
 * optional courses can ever bring it back under.
 *
 * "below-min" is the opposite direction, so it needs the opposite scope:
 * optional groups CAN help reach the floor (that's their whole point), so
 * the reachable ceiling has to include every optional group's best
 * available course too, not just the required groups'. Checking required
 * groups alone here was a real bug, not just a wording nitpick — it fired
 * even when the user had already added more than enough credits in a
 * selection group to clear the floor, because that group's courses were
 * never counted.
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
  let sumMaxRequired = 0;
  for (const group of requiredGroups) {
    const credits = creditsOf(group, courseById);
    if (credits.length === 0) continue;
    sumMin += Math.min(...credits);
    sumMaxRequired += Math.max(...credits);
  }

  if (sumMin > maxCredit) {
    return { type: "above-max", minPossible: sumMin, maxCredit };
  }

  let sumMaxOptional = 0;
  for (const group of groups.filter((g) => !g.required)) {
    const credits = creditsOf(group, courseById);
    if (credits.length === 0) continue;
    sumMaxOptional += Math.max(...credits);
  }

  const sumMaxAll = sumMaxRequired + sumMaxOptional;
  if (sumMaxAll < minCredit) {
    return { type: "below-min", maxPossible: sumMaxAll, minCredit };
  }
  return null;
}

/** User-facing message for a warning -- shared so every caller (currently
 * just the "시간표 생성" 클릭 시 모달, see StepResults.tsx) renders identical
 * copy instead of re-deriving it. */
export function formatCreditRangeWarning(warning: CreditRangeWarning): string {
  switch (warning.type) {
    case "empty-required":
      return `"${warning.groupName}" 그룹이 필수인데 담긴 과목이 없어요 — 과목을 최소 1개 담아야 조합을 만들 수 있어요.`;
    case "above-max":
      return `필수 그룹만 골라도 최소 ${warning.minPossible}학점이라 목표 학점(${warning.maxCredit}학점)을 넘어요 — 필수 그룹을 줄이거나 학점이 적은 과목을 담아보세요.`;
    case "below-min":
      return `필수 그룹만으로는 최대 ${warning.maxPossible}학점이라 최소 학점(${warning.minCredit}학점)에 못 미쳐요 — 선택 그룹에서 과목을 더 담아보세요.`;
  }
}
