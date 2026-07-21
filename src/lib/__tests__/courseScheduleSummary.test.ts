import { describe, expect, it } from "vitest";

import { courseScheduleSegments, describeCourseSchedule } from "../courseScheduleSummary";
import type { CourseRow } from "../types";

function makeCourse(schedules: CourseRow["schedules"]): CourseRow {
  return {
    id: 1,
    courseNo: "BIS2003",
    classNo: "01",
    courseName: "인도의철학과문화",
    professor: null,
    college: "불교대학",
    department: null,
    credit: "3.0",
    courseType: "전공",
    detailCurriculum: null,
    lectureStyle: "일반강의",
    capacity: null,
    appliedCount: null,
    remarks: null,
    schedules,
  };
}

describe("describeCourseSchedule", () => {
  it("returns a placeholder when there are no schedule rows", () => {
    expect(describeCourseSchedule(makeCourse([]))).toBe("시간 미정");
  });

  it("groups same time+classroom across multiple days into one line", () => {
    const course = makeCourse([
      { dayOfWeek: 2, periodStart: "7", periodEnd: "8", startTime: "15:00:00", endTime: "16:30:00", classroom: "342호", rawText: "화 7교시(15:00) ~ 8교시(16:30)" },
      { dayOfWeek: 4, periodStart: "7", periodEnd: "8", startTime: "15:00:00", endTime: "16:30:00", classroom: "342호", rawText: "목 7교시(15:00) ~ 8교시(16:30)" },
    ]);
    expect(describeCourseSchedule(course)).toBe("화,목 15:00~16:30 · 342호");
  });

  it("falls back to raw text when day/time failed to parse", () => {
    const course = makeCourse([
      { dayOfWeek: null, periodStart: null, periodEnd: null, startTime: null, endTime: null, classroom: "342호", rawText: "완전히 다른 포맷" },
    ]);
    expect(describeCourseSchedule(course)).toBe("완전히 다른 포맷 · 342호");
  });

  it("keeps distinct time/classroom groups on separate segments", () => {
    const course = makeCourse([
      { dayOfWeek: 1, periodStart: "1", periodEnd: "2", startTime: "09:00:00", endTime: "10:30:00", classroom: "A101", rawText: "월 1교시(09:00) ~ 2교시(10:30)" },
      { dayOfWeek: 3, periodStart: "5", periodEnd: "6", startTime: "13:00:00", endTime: "14:30:00", classroom: "B202", rawText: "수 5교시(13:00) ~ 6교시(14:30)" },
    ]);
    expect(describeCourseSchedule(course)).toBe("월 09:00~10:30 · A101 / 수 13:00~14:30 · B202");
  });
});

describe("courseScheduleSegments", () => {
  it("returns [] when there are no schedule rows", () => {
    expect(courseScheduleSegments(makeCourse([]))).toEqual([]);
  });

  it("returns one segment per (time, classroom) group, structured for table columns", () => {
    const course = makeCourse([
      { dayOfWeek: 2, periodStart: "7", periodEnd: "8", startTime: "15:00:00", endTime: "16:30:00", classroom: "342호", rawText: "화 7교시(15:00) ~ 8교시(16:30)" },
      { dayOfWeek: 4, periodStart: "7", periodEnd: "8", startTime: "15:00:00", endTime: "16:30:00", classroom: "342호", rawText: "목 7교시(15:00) ~ 8교시(16:30)" },
    ]);
    expect(courseScheduleSegments(course)).toEqual([{ timeLabel: "화,목 15:00~16:30", classroom: "342호" }]);
  });

  it("keeps a null classroom as null, not a string", () => {
    const course = makeCourse([
      { dayOfWeek: 1, periodStart: "1", periodEnd: "2", startTime: "09:00:00", endTime: "10:30:00", classroom: null, rawText: "월 1교시(09:00) ~ 2교시(10:30)" },
    ]);
    expect(courseScheduleSegments(course)).toEqual([{ timeLabel: "월 09:00~10:30", classroom: null }]);
  });
});
