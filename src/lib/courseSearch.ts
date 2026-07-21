import { getCompetitionRate } from "./competitionRate";
import type { CourseRow } from "./types";

export type CourseSortOption = "default" | "competition" | "credit";

export interface CourseFilter {
  college?: string;
  department?: string;
  courseType?: string;
  /** 1(월) ~ 7(일) — matches when any of the course's schedules falls on this day. */
  dayOfWeek?: number;
  query?: string;
  sort?: CourseSortOption;
}

/** Free-text match against name/course-no/professor, plus optional college/department/
 * 영역구분(courseType)/요일 dropdown filters and an optional sort. */
export function searchCourses(courses: CourseRow[], filter: CourseFilter): CourseRow[] {
  const query = filter.query?.trim().toLowerCase() ?? "";

  const filtered = courses.filter((course) => {
    if (filter.college && course.college !== filter.college) return false;
    if (filter.department && course.department !== filter.department) return false;
    if (filter.courseType && course.courseType !== filter.courseType) return false;
    if (filter.dayOfWeek != null && !course.schedules.some((s) => s.dayOfWeek === filter.dayOfWeek)) return false;
    if (!query) return true;

    return (
      course.courseName.toLowerCase().includes(query) ||
      course.courseNo.toLowerCase().includes(query) ||
      (course.professor?.toLowerCase().includes(query) ?? false)
    );
  });

  if (filter.sort === "competition") {
    return [...filtered].sort((a, b) => getCompetitionRate(b).rate - getCompetitionRate(a).rate);
  }
  if (filter.sort === "credit") {
    return [...filtered].sort((a, b) => parseFloat(b.credit) - parseFloat(a.credit));
  }
  return filtered;
}

export function listColleges(courses: CourseRow[]): string[] {
  return Array.from(new Set(courses.map((c) => c.college))).sort((a, b) => a.localeCompare(b, "ko"));
}

/** Departments scoped to a college when given, so the dropdown narrows as expected. */
export function listDepartments(courses: CourseRow[], college?: string): string[] {
  const scoped = college ? courses.filter((c) => c.college === college) : courses;
  const departments = scoped.map((c) => c.department).filter((d): d is string => Boolean(d));
  return Array.from(new Set(departments)).sort((a, b) => a.localeCompare(b, "ko"));
}

export function listCourseTypes(courses: CourseRow[]): string[] {
  return Array.from(new Set(courses.map((c) => c.courseType))).sort((a, b) => a.localeCompare(b, "ko"));
}
