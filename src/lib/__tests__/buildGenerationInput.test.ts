import { describe, expect, it } from "vitest";

import { buildGenerationInput } from "../buildGenerationInput";
import type { CourseRow } from "../types";

function makeCourse(id: number, overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id,
    courseNo: `C${id}`,
    classNo: "01",
    courseName: `과목${id}`,
    courseNameEn: null,
    professor: null,
    college: "불교대학",
    department: null,
    major: null,
    credit: "3.0",
    courseType: "전공",
    detailCurriculum: null,
    lectureStyle: null,
    lectureType: null,
    targetGrade: null,
    capacity: null,
    enrolled: null,
    gradeType: null,
    evalMethod: null,
    lectureRegion: null,
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
    expect(blocksByCourseId.get("1")).toEqual([{ dayOfWeek: 2, startMinutes: 900, endMinutes: 990 }]);
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
  });
});
