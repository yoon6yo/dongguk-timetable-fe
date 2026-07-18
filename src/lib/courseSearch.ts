import type { CourseRow } from "./types";

export interface CourseFilter {
  college?: string;
  department?: string;
  query?: string;
}

/** Free-text match against name/course-no/professor, plus optional college/department dropdown filters. */
export function searchCourses(courses: CourseRow[], filter: CourseFilter): CourseRow[] {
  const query = filter.query?.trim().toLowerCase() ?? "";

  return courses.filter((course) => {
    if (filter.college && course.college !== filter.college) return false;
    if (filter.department && course.department !== filter.department) return false;
    if (!query) return true;

    return (
      course.courseName.toLowerCase().includes(query) ||
      course.courseNo.toLowerCase().includes(query) ||
      (course.professor?.toLowerCase().includes(query) ?? false)
    );
  });
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
