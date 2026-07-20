import { describe, expect, it } from "vitest";

import { computeCreditRangeWarning } from "../creditRangeWarning";
import type { CourseGroup } from "../../store/groupsStore";
import type { CourseRow } from "../types";

function group(overrides: Partial<CourseGroup> = {}): CourseGroup {
  return { id: "g1", name: "그룹 1", required: true, courseIds: [], ...overrides };
}

function course(id: number, credit: string): [number, CourseRow] {
  return [
    id,
    {
      id,
      courseNo: `C${id}`,
      classNo: "01",
      courseName: `과목${id}`,
      professor: null,
      college: "단과대",
      department: null,
      credit,
      capacity: null,
      appliedCount: null,
      remarks: null,
      schedules: [],
    },
  ];
}

describe("computeCreditRangeWarning", () => {
  it("returns null when no groups exist", () => {
    expect(computeCreditRangeWarning([], new Map(), 12, 21)).toBeNull();
  });

  it("returns null when the range is satisfiable", () => {
    // 4 separate required groups, one course (3 credits) each -> 12 total, exactly at the floor
    const courseById = new Map([course(1, "3.0"), course(2, "3.0"), course(3, "3.0"), course(4, "3.0")]);
    const groups = [
      group({ id: "g1", courseIds: [1] }),
      group({ id: "g2", courseIds: [2] }),
      group({ id: "g3", courseIds: [3] }),
      group({ id: "g4", courseIds: [4] }),
    ];
    expect(computeCreditRangeWarning(groups, courseById, 12, 21)).toBeNull();
  });

  it("reports empty-required when a required group has no courses, before checking credit math", () => {
    const groups = [group({ name: "전공필수", courseIds: [] })];
    const result = computeCreditRangeWarning(groups, new Map(), 12, 21);
    expect(result).toEqual({ type: "empty-required", groupName: "전공필수" });
  });

  it("ignores optional groups entirely, even if empty (not flagged, not counted)", () => {
    const courseById = new Map([course(1, "3.0"), course(2, "3.0"), course(3, "3.0"), course(4, "3.0")]);
    const groups = [
      group({ id: "g1", courseIds: [1] }),
      group({ id: "g2", courseIds: [2] }),
      group({ id: "g3", courseIds: [3] }),
      group({ id: "g4", courseIds: [4] }),
      group({ id: "g5", required: false, courseIds: [] }), // empty optional group
    ];
    expect(computeCreditRangeWarning(groups, courseById, 12, 21)).toBeNull();
  });

  it("reports above-max when even the lowest-credit pick per required group exceeds the cap", () => {
    const courseById = new Map([
      course(1, "9.0"),
      course(2, "9.0"),
      course(3, "9.0"),
      course(4, "9.0"),
    ]);
    // g1: min candidate 9, g2: min candidate 9 -> unconditional floor of 18... still under 21, adjust
    const groups = [
      group({ id: "g1", courseIds: [1] }),
      group({ id: "g2", courseIds: [2] }),
      group({ id: "g3", courseIds: [3] }),
    ];
    // 9 + 9 + 9 = 27 > 21, unconditional
    const result = computeCreditRangeWarning(groups, courseById, 12, 21);
    expect(result).toEqual({ type: "above-max", minPossible: 27, maxCredit: 21 });
  });

  it("reports below-min when even the highest-credit pick per required group can't reach the floor", () => {
    const courseById = new Map([course(1, "1.0"), course(2, "2.0")]);
    const groups = [group({ id: "g1", courseIds: [1] }), group({ id: "g2", courseIds: [2] })];
    // best case 1 + 2 = 3, well under 12
    const result = computeCreditRangeWarning(groups, courseById, 12, 21);
    expect(result).toEqual({ type: "below-min", maxPossible: 3, minCredit: 12 });
  });

  it("uses min credit per group (not max) when checking above-max, so a group with a wide credit spread isn't unfairly flagged", () => {
    const courseById = new Map([course(1, "1.0"), course(2, "9.0"), course(3, "9.0")]);
    // g1 has both a 1-credit and a 9-credit option -> min is 1, so picking the
    // 1-credit option keeps the total under the cap even though 9+9 would not.
    const groups = [group({ id: "g1", courseIds: [1, 2] }), group({ id: "g2", courseIds: [3] })];
    expect(computeCreditRangeWarning(groups, courseById, 12, 21)).toBeNull();
  });

  it("treats a courseId missing from courseById as contributing nothing (dropped course)", () => {
    const courseById = new Map([course(1, "3.0")]);
    const groups = [group({ courseIds: [1, 999] })];
    expect(computeCreditRangeWarning(groups, courseById, 0, 21)).toBeNull();
  });
});
