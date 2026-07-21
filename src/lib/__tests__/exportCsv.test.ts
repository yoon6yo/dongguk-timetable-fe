import { describe, expect, it } from "vitest";

import { buildTimetableCsv } from "../exportCsv";
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
        classroom: "342(혜화관 207-342 342 강의실)",
        rawText: "화 7교시(15:00) ~ 8교시(16:30)",
      },
    ],
    ...overrides,
  };
}

describe("buildTimetableCsv", () => {
  it("starts with a UTF-8 BOM so Excel doesn't mangle Korean text", () => {
    const csv = buildTimetableCsv([makeCourse()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes the header row", () => {
    const csv = buildTimetableCsv([]);
    expect(csv).toContain("과목명,학수번호,교수,요일,시간,강의실,학점");
  });

  it("emits one row per course with its schedule fields", () => {
    const csv = buildTimetableCsv([makeCourse()]);
    expect(csv).toContain("자료구조,CS101,홍길동,화,15:00 ~ 16:30,342(혜화관 207-342 342 강의실),3.0");
  });

  it("emits one row per schedule occurrence for a multi-meeting course", () => {
    const course = makeCourse({
      schedules: [
        {
          dayOfWeek: 2,
          periodStart: "1",
          periodEnd: "2",
          startTime: "09:00:00",
          endTime: "10:30:00",
          classroom: "A",
          rawText: "화",
        },
        {
          dayOfWeek: 4,
          periodStart: "1",
          periodEnd: "2",
          startTime: "09:00:00",
          endTime: "10:30:00",
          classroom: "A",
          rawText: "목",
        },
      ],
    });
    const csv = buildTimetableCsv([course]);
    const dataLines = csv.split("\r\n").slice(1);
    expect(dataLines).toHaveLength(2);
  });

  it("falls back to raw schedule text when start/end time failed to parse", () => {
    const course = makeCourse({
      schedules: [
        {
          dayOfWeek: null,
          periodStart: null,
          periodEnd: null,
          startTime: null,
          endTime: null,
          classroom: null,
          rawText: "확인 필요",
        },
      ],
    });
    const csv = buildTimetableCsv([course]);
    expect(csv).toContain("확인 필요");
  });

  it("still emits a row for a course with no schedules at all", () => {
    const csv = buildTimetableCsv([makeCourse({ schedules: [] })]);
    const dataLines = csv.split("\r\n").slice(1);
    expect(dataLines).toHaveLength(1);
  });

  it("quotes and escapes fields containing commas or quotes", () => {
    const course = makeCourse({ professor: 'Kim, "The Great"' });
    const csv = buildTimetableCsv([course]);
    expect(csv).toContain('"Kim, ""The Great"""');
  });

  it("handles an empty course list", () => {
    const csv = buildTimetableCsv([]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(1); // header only
  });
});
