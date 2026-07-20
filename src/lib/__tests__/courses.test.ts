import { describe, expect, it } from "vitest";

import { getCoursesForSemester } from "../courses";
import { FakeQueryable } from "./fakeDb";

function makeCourseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    courseNo: "BIS2003",
    classNo: "01",
    courseName: "인도의철학과문화",
    courseNameEn: null,
    professor: "이병재",
    college: "불교대학",
    department: "불교학부",
    major: null,
    credit: "3.0",
    courseType: "전공",
    detailCurriculum: "기초",
    lectureStyle: "일반강의",
    lectureType: "이론",
    targetGrade: "1학년",
    capacity: 0,
    enrolled: 0,
    appliedCount: null,
    gradeType: "해당없음",
    evalMethod: "해당없음",
    lectureRegion: "서울",
    remarks: "팀티칭",
    ...overrides,
  };
}

describe("getCoursesForSemester", () => {
  it("returns [] and never queries schedules when there are no courses", async () => {
    const db = new FakeQueryable([{ match: "FROM courses", rows: [] }]);

    const result = await getCoursesForSemester(db, 1);

    expect(result).toEqual([]);
    expect(db.calls).toHaveLength(1);
  });

  it("nests each course's schedules grouped by courseId", async () => {
    const db = new FakeQueryable([
      {
        match: "FROM courses",
        rows: [makeCourseRow({ id: 1 }), makeCourseRow({ id: 2, courseNo: "BIS2004" })],
      },
      {
        match: "FROM schedules",
        rows: [
          {
            courseId: 1,
            dayOfWeek: 2,
            periodStart: "7",
            periodEnd: "8",
            startTime: "15:00:00",
            endTime: "16:30:00",
            classroom: "342(혜화관 207-342 342 강의실)",
            rawText: "화, 목 7교시(15:00) ~ 8교시(16:30)",
          },
          {
            courseId: 1,
            dayOfWeek: 4,
            periodStart: "7",
            periodEnd: "8",
            startTime: "15:00:00",
            endTime: "16:30:00",
            classroom: "342(혜화관 207-342 342 강의실)",
            rawText: "화, 목 7교시(15:00) ~ 8교시(16:30)",
          },
          {
            courseId: 2,
            dayOfWeek: 5,
            periodStart: "5",
            periodEnd: "7.5",
            startTime: "13:00:00",
            endTime: "16:00:00",
            classroom: "337(혜화관 207-337 337 강의실)",
            rawText: "금 5교시(13:00) ~ 7.5교시(16:00)",
          },
        ],
      },
    ]);

    const result = await getCoursesForSemester(db, 1);

    expect(result).toHaveLength(2);
    expect(result[0].schedules).toHaveLength(2);
    expect(result[0].schedules.map((s) => s.dayOfWeek)).toEqual([2, 4]);
    expect(result[1].schedules).toHaveLength(1);
    expect(result[1].schedules[0].dayOfWeek).toBe(5);
    // courseId must not leak into the nested schedule objects returned to callers.
    expect(result[0].schedules[0]).not.toHaveProperty("courseId");
  });

  it("gives a course with no schedule rows an empty array, not undefined", async () => {
    const db = new FakeQueryable([
      { match: "FROM courses", rows: [makeCourseRow({ id: 1 })] },
      { match: "FROM schedules", rows: [] },
    ]);

    const result = await getCoursesForSemester(db, 1);

    expect(result[0].schedules).toEqual([]);
  });

  it("queries schedules scoped to exactly the course ids just fetched", async () => {
    const db = new FakeQueryable([
      { match: "FROM courses", rows: [makeCourseRow({ id: 5 }), makeCourseRow({ id: 9 })] },
      { match: "FROM schedules", rows: [] },
    ]);

    await getCoursesForSemester(db, 1);

    const scheduleCall = db.calls.find((c) => c.sql.includes("FROM schedules"));
    expect(scheduleCall?.params).toEqual([5, 9]);
  });

  it("scopes the courses query to the given semesterId", async () => {
    const db = new FakeQueryable([{ match: "FROM courses", rows: [] }]);

    await getCoursesForSemester(db, 42);

    expect(db.calls[0].sql).toContain("WHERE semester_id = ?");
    expect(db.calls[0].params).toEqual([42]);
  });
});
