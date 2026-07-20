import { describe, expect, it } from "vitest";

import { listColleges, listDepartments, searchCourses } from "../courseSearch";
import type { CourseRow } from "../types";

function makeCourse(overrides: Partial<CourseRow> = {}): CourseRow {
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
    remarks: null,
    schedules: [],
    ...overrides,
  };
}

describe("searchCourses", () => {
  const courses = [
    makeCourse({ id: 1, courseName: "인도의철학과문화", courseNo: "BIS2003", professor: "이병재", college: "불교대학", department: "불교학부" }),
    makeCourse({ id: 2, courseName: "선의이해", courseNo: "BIS2004", professor: "김윤경", college: "불교대학", department: "불교학부" }),
    makeCourse({ id: 3, courseName: "자료구조", courseNo: "CSE2001", professor: "박선생", college: "공과대학", department: "컴퓨터공학과" }),
  ];

  it("returns everything when no filter is given", () => {
    expect(searchCourses(courses, {})).toHaveLength(3);
  });

  it("filters by college", () => {
    const result = searchCourses(courses, { college: "공과대학" });
    expect(result.map((c) => c.id)).toEqual([3]);
  });

  it("filters by department", () => {
    const result = searchCourses(courses, { department: "불교학부" });
    expect(result.map((c) => c.id).sort()).toEqual([1, 2]);
  });

  it("matches free text against course name", () => {
    expect(searchCourses(courses, { query: "선의이해" }).map((c) => c.id)).toEqual([2]);
  });

  it("matches free text against course number, case-insensitively", () => {
    expect(searchCourses(courses, { query: "cse2001" }).map((c) => c.id)).toEqual([3]);
  });

  it("matches free text against professor name", () => {
    expect(searchCourses(courses, { query: "김윤경" }).map((c) => c.id)).toEqual([2]);
  });

  it("combines dropdown filters and free text with AND semantics", () => {
    const result = searchCourses(courses, { college: "불교대학", query: "김윤경" });
    expect(result.map((c) => c.id)).toEqual([2]);
  });

  it("does not crash on a course with a null professor", () => {
    const withNullProfessor = [makeCourse({ id: 4, professor: null })];
    expect(searchCourses(withNullProfessor, { query: "아무개" })).toEqual([]);
  });
});

describe("listColleges", () => {
  it("returns unique, sorted college names", () => {
    const courses = [makeCourse({ college: "공과대학" }), makeCourse({ college: "불교대학" }), makeCourse({ college: "공과대학" })];
    expect(listColleges(courses)).toEqual(["공과대학", "불교대학"]);
  });
});

describe("listDepartments", () => {
  const courses = [
    makeCourse({ college: "불교대학", department: "불교학부" }),
    makeCourse({ college: "공과대학", department: "컴퓨터공학과" }),
    makeCourse({ college: "공과대학", department: "전자전기공학부" }),
    makeCourse({ college: "공과대학", department: null }),
  ];

  it("returns all departments when no college is given", () => {
    expect(listDepartments(courses)).toEqual(["불교학부", "전자전기공학부", "컴퓨터공학과"]);
  });

  it("scopes departments to the given college", () => {
    expect(listDepartments(courses, "공과대학")).toEqual(["전자전기공학부", "컴퓨터공학과"]);
  });

  it("drops null departments", () => {
    expect(listDepartments(courses, "공과대학")).not.toContain(null);
  });
});
