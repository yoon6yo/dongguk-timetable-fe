import { describe, expect, it } from "vitest";

import { expandCourseSchedules } from "../expandSchedules";
import type { CourseRow } from "../types";

function makeCourse(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: 1,
    courseNo: "CS101",
    classNo: "01",
    courseName: "자료구조",
    professor: "홍길동",
    college: "공과대학",
    department: null,
    credit: "3.0",
    courseType: "전공",
    detailCurriculum: null,
    lectureStyle: "일반강의",
    capacity: null,
    appliedCount: null,
    remarks: null,
    schedules: [],
    ...overrides,
  };
}

describe("expandCourseSchedules", () => {
  it("emits one row per schedule occurrence", () => {
    const course = makeCourse({
      schedules: [
        { dayOfWeek: 2, periodStart: "1", periodEnd: "2", startTime: "09:00:00", endTime: "10:30:00", classroom: "A", rawText: "화" },
        { dayOfWeek: 4, periodStart: "1", periodEnd: "2", startTime: "09:00:00", endTime: "10:30:00", classroom: "A", rawText: "목" },
      ],
    });
    const rows = expandCourseSchedules([course]);
    expect(rows).toHaveLength(2);
    expect(rows[0].schedule?.dayOfWeek).toBe(2);
    expect(rows[1].schedule?.dayOfWeek).toBe(4);
  });

  it("falls back to a single null-schedule row for a course with none", () => {
    const rows = expandCourseSchedules([makeCourse({ schedules: [] })]);
    expect(rows).toEqual([{ course: expect.objectContaining({ id: 1 }), schedule: null }]);
  });

  it("handles an empty course list", () => {
    expect(expandCourseSchedules([])).toEqual([]);
  });
});
