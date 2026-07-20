import { describe, expect, it } from "vitest";

import { buildGenerationInput } from "../buildGenerationInput";
import type { CourseRow } from "../types";

function makeCourse(id: number, overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id,
    courseNo: `C${id}`,
    classNo: "01",
    courseName: `과목${id}`,
    professor: null,
    college: "불교대학",
    department: null,
    credit: "3.0",
    capacity: null,
    appliedCount: null,
    remarks: null,
    schedules: [
      {
        dayOfWeek: 2,
        periodStart: "7",
        periodEnd: "8",
        startTime: "15:00:00",
        endTime: "16:30:00",
        classroom: "342",
        rawText: "화 7교시(15:00) ~ 8교시(16:30)",
      },
    ],
    ...overrides,
  };
}

describe("buildGenerationInput", () => {
  it("maps a group's courseIds to resolved candidates with parsed blocks", () => {
    const courses = [makeCourse(1), makeCourse(2)];
    const groups = [{ id: "g1", name: "전공", required: true, courseIds: [1, 2] }];

    const { groups: resolved, blocksByCourseId } = buildGenerationInput(groups, courses);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].candidates.map((c) => c.courseId)).toEqual(["1", "2"]);
    expect(blocksByCourseId.get("1")).toEqual([
      { dayOfWeek: 2, startMinutes: 900, endMinutes: 990, classroom: "342" },
    ]);
  });

  it("silently drops a courseId that no longer exists in the fetched catalog", () => {
    const courses = [makeCourse(1)];
    const groups = [{ id: "g1", name: "전공", required: true, courseIds: [1, 999] }];

    const { groups: resolved } = buildGenerationInput(groups, courses);

    expect(resolved[0].candidates).toHaveLength(1);
    expect(resolved[0].candidates[0].courseId).toBe("1");
  });

  it("preserves the group's required flag", () => {
    const courses = [makeCourse(1)];
    const groups = [{ id: "g1", name: "선택", required: false, courseIds: [1] }];

    const { groups: resolved } = buildGenerationInput(groups, courses);

    expect(resolved[0].required).toBe(false);
  });

  it("drops schedule rows that failed to parse (null dayOfWeek) from the blocks", () => {
    const courses = [
      makeCourse(1, {
        schedules: [
          {
            dayOfWeek: null,
            periodStart: null,
            periodEnd: null,
            startTime: null,
            endTime: null,
            classroom: null,
            rawText: "파싱 실패",
          },
        ],
      }),
    ];
    const groups = [{ id: "g1", name: "전공", required: true, courseIds: [1] }];

    const { blocksByCourseId } = buildGenerationInput(groups, courses);

    expect(blocksByCourseId.get("1")).toEqual([]);
  });

  it("handles an empty groups array", () => {
    const result = buildGenerationInput([], []);
    expect(result.groups).toEqual([]);
    expect(result.blocksByCourseId.size).toBe(0);
    expect(result.creditByCourseId.size).toBe(0);
  });

  it("parses the DB's string credit into a number on each candidate and in creditByCourseId", () => {
    const courses = [makeCourse(1, { credit: "3.0" }), makeCourse(2, { credit: "1.5" })];
    const groups = [{ id: "g1", name: "전공", required: true, courseIds: [1, 2] }];

    const { groups: resolved, creditByCourseId } = buildGenerationInput(groups, courses);

    expect(resolved[0].candidates.map((c) => c.credit)).toEqual([3, 1.5]);
    expect(creditByCourseId.get("1")).toBe(3);
    expect(creditByCourseId.get("2")).toBe(1.5);
  });

  it("falls back to 0 credit rather than NaN when the DB value is unparsable", () => {
    const courses = [makeCourse(1, { credit: "학점없음" })];
    const groups = [{ id: "g1", name: "전공", required: true, courseIds: [1] }];

    const { groups: resolved, creditByCourseId } = buildGenerationInput(groups, courses);

    expect(resolved[0].candidates[0].credit).toBe(0);
    expect(creditByCourseId.get("1")).toBe(0);
  });
});
