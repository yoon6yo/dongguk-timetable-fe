import { describe, expect, it } from "vitest";

import { buildTimetableTxt } from "../exportTxt";
import type { CourseRow } from "../types";

function makeCourse(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: 1,
    courseNo: "CS101",
    classNo: "01",
    courseName: "자료구조",
    professor: "홍길동",
    college: "공과대학",
    department: "컴퓨터공학과",
    credit: "3.0",
    courseType: "전공",
    detailCurriculum: null,
    lectureStyle: "일반강의",
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
        classroom: "342호",
        rawText: "화 7교시(15:00) ~ 8교시(16:30)",
      },
    ],
    ...overrides,
  };
}

describe("buildTimetableTxt", () => {
  it("includes a course count and total credit summary header", () => {
    const txt = buildTimetableTxt([makeCourse(), makeCourse({ id: 2, credit: "2.0" })]);
    expect(txt).toContain("시간표 (2과목 · 5학점)");
  });

  it("includes the course name with courseNo-classNo section", () => {
    const txt = buildTimetableTxt([makeCourse()]);
    expect(txt).toContain("자료구조 (CS101-01)");
  });

  it("includes professor and credit", () => {
    const txt = buildTimetableTxt([makeCourse()]);
    expect(txt).toContain("교수: 홍길동 · 학점: 3.0");
  });

  it("includes day/time/classroom for each schedule row", () => {
    const txt = buildTimetableTxt([makeCourse()]);
    expect(txt).toContain("화 15:00~16:30 · 342호");
  });

  it("falls back to raw text when day/time failed to parse", () => {
    const course = makeCourse({
      schedules: [
        { dayOfWeek: null, periodStart: null, periodEnd: null, startTime: null, endTime: null, classroom: null, rawText: "확인 필요" },
      ],
    });
    expect(buildTimetableTxt([course])).toContain("확인 필요");
  });

  it("shows a placeholder for a course with no schedules", () => {
    const txt = buildTimetableTxt([makeCourse({ schedules: [] })]);
    expect(txt).toContain("시간 미정");
  });

  it("includes remarks when present", () => {
    const txt = buildTimetableTxt([makeCourse({ remarks: "1학년 전용" })]);
    expect(txt).toContain("비고: 1학년 전용");
  });

  it("omits the remarks line when absent", () => {
    const txt = buildTimetableTxt([makeCourse({ remarks: null })]);
    expect(txt).not.toContain("비고:");
  });

  it("handles an empty course list", () => {
    const txt = buildTimetableTxt([]);
    expect(txt).toContain("시간표 (0과목 · 0학점)");
  });
});
