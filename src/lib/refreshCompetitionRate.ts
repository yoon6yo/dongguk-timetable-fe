import type { CourseRow } from "./types";

/**
 * Saved timetables freeze a full course snapshot at save time (see
 * `savedTimetablesStore`'s docstring) so the grid/table stay renderable after
 * a semester rollover -- but that means `capacity`/`appliedCount` inside the
 * snapshot goes stale the moment a later crawl updates the real numbers.
 * Overlays the *current* live catalog's capacity/appliedCount onto each saved
 * course, matched by (courseNo, classNo) rather than `id` -- the frozen id
 * is a snapshot-time DB row id that a fresh catalog fetch has no reason to
 * reproduce.
 *
 * Only overlays when the saved timetable's semester is still the live one:
 * course numbers get reused every semester, so matching a stale semester's
 * snapshot against an unrelated current-semester section by number alone
 * would silently substitute the wrong course's numbers in. In that case the
 * old snapshot -- while stale -- is still the closest available data, so it's
 * left untouched rather than replaced with something actively wrong.
 */
export function refreshCompetitionRate(
  savedCourses: CourseRow[],
  savedSemesterId: number,
  liveSemesterId: number | null,
  liveCourses: CourseRow[]
): CourseRow[] {
  if (liveSemesterId == null || liveSemesterId !== savedSemesterId) return savedCourses;

  const liveByKey = new Map(liveCourses.map((c) => [`${c.courseNo}-${c.classNo}`, c]));
  return savedCourses.map((course) => {
    const live = liveByKey.get(`${course.courseNo}-${course.classNo}`);
    if (!live) return course;
    return { ...course, capacity: live.capacity, appliedCount: live.appliedCount };
  });
}
