import { describe, expect, it } from "vitest";

import { refreshCompetitionRate } from "../refreshCompetitionRate";
import type { CourseRow } from "../types";

function makeCourse(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: 1,
    courseNo: "BIS2003",
    classNo: "01",
    courseName: "인도의철학과문화",
    professor: "이병재",
    college: "불교대학",
    department: "불교학부",
    credit: "3.0",
    courseType: "전공",
    detailCurriculum: null,
    lectureStyle: "일반강의",
    capacity: 0,
    appliedCount: null,
    remarks: null,
    schedules: [],
    ...overrides,
  };
}

describe("refreshCompetitionRate", () => {
  it("overlays the live catalog's capacity/appliedCount when the semester still matches", () => {
    const saved = [makeCourse({ id: 99, courseNo: "BIS2003", classNo: "01", capacity: 30, appliedCount: 10 })];
    const live = [makeCourse({ id: 1, courseNo: "BIS2003", classNo: "01", capacity: 30, appliedCount: 55 })];

    const result = refreshCompetitionRate(saved, 4, 4, live);

    expect(result[0].appliedCount).toBe(55);
    // non-competition fields (e.g. the frozen snapshot's own id) are left alone
    expect(result[0].id).toBe(99);
  });

  it("matches by (courseNo, classNo), not by id -- the frozen snapshot id is a stale DB row id", () => {
    const saved = [makeCourse({ id: 99, courseNo: "BIS2003", classNo: "01", appliedCount: 10 })];
    const live = [makeCourse({ id: 12345, courseNo: "BIS2003", classNo: "01", appliedCount: 55 })];

    const result = refreshCompetitionRate(saved, 4, 4, live);

    expect(result[0].appliedCount).toBe(55);
  });

  it("leaves the saved snapshot untouched when the live semester differs", () => {
    const saved = [makeCourse({ courseNo: "BIS2003", classNo: "01", appliedCount: 10 })];
    const live = [makeCourse({ courseNo: "BIS2003", classNo: "01", appliedCount: 999 })];

    const result = refreshCompetitionRate(saved, 4, 5, live);

    expect(result[0].appliedCount).toBe(10);
  });

  it("leaves the saved snapshot untouched when there's no live semester yet (still loading)", () => {
    const saved = [makeCourse({ courseNo: "BIS2003", classNo: "01", appliedCount: 10 })];

    const result = refreshCompetitionRate(saved, 4, null, []);

    expect(result[0].appliedCount).toBe(10);
  });

  it("falls back to the saved snapshot for a course no longer in the live catalog (cancelled section)", () => {
    const saved = [makeCourse({ courseNo: "BIS2003", classNo: "01", appliedCount: 10 })];
    const live = [makeCourse({ courseNo: "OTHER999", classNo: "02", appliedCount: 999 })];

    const result = refreshCompetitionRate(saved, 4, 4, live);

    expect(result[0].appliedCount).toBe(10);
  });

  it("does not confuse two different class sections of the same course number", () => {
    const saved = [makeCourse({ courseNo: "BIS2003", classNo: "01", appliedCount: 10 })];
    const live = [makeCourse({ courseNo: "BIS2003", classNo: "02", appliedCount: 999 })];

    const result = refreshCompetitionRate(saved, 4, 4, live);

    expect(result[0].appliedCount).toBe(10);
  });
});
