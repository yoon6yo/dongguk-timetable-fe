import { useEffect } from "react";

import { useCoursesStore } from "@/store/coursesStore";
import { useGroupsStore } from "@/store/groupsStore";

/**
 * Detects when a persisted CourseGroup snapshot (localStorage) was built
 * against a semester that's no longer the live one -- e.g. the user left
 * groups in their browser across a semester rollover, and the courseIds
 * they saved no longer resolve against the newly-fetched catalog. Resets
 * groups and returns true (for the rest of this session) so the caller can
 * show a notice.
 *
 * Two independent signals trigger a reset, since `builtForSemesterCode` is
 * only stamped going forward (from the release that introduced it onward):
 * 1. `builtForSemesterCode` set and it no longer matches the live semester.
 * 2. Any persisted group references a courseId that isn't in the freshly
 *    fetched catalog at all -- catches users who already had stale groups
 *    in localStorage from *before* this guard existed, who would otherwise
 *    never get `builtForSemesterCode` populated and so never get flagged by
 *    check 1. `/api/courses` only ever serves the current semester's rows,
 *    so an unresolvable id here is (for all practical purposes) always a
 *    leftover from a prior semester, not a same-semester data quirk.
 *
 * The "should we show a notice" flag lives in groupsStore itself
 * (semesterMismatchDetected), not local React state/refs -- both of those
 * patterns hit lint errors here (set-state-in-effect / refs-during-render)
 * since resetGroupsForSemesterMismatch() already causes this hook to
 * re-render via its builtForSemesterCode subscription, so a plain store
 * selector read during render is both simpler and rule-compliant.
 */
export function useSemesterMismatchGuard(): boolean {
  const status = useCoursesStore((s) => s.status);
  const semester = useCoursesStore((s) => s.semester);
  const courses = useCoursesStore((s) => s.courses);
  const groups = useGroupsStore((s) => s.groups);
  const builtForSemesterCode = useGroupsStore((s) => s.builtForSemesterCode);
  const semesterMismatchDetected = useGroupsStore((s) => s.semesterMismatchDetected);
  const resetGroupsForSemesterMismatch = useGroupsStore((s) => s.resetGroupsForSemesterMismatch);

  useEffect(() => {
    if (status !== "loaded" || !semester) return;

    const stampedMismatch = Boolean(builtForSemesterCode) && builtForSemesterCode !== semester.semesterCode;
    const hasOrphanedCourseId =
      groups.length > 0 &&
      (() => {
        const courseIds = new Set(courses.map((c) => c.id));
        return groups.some((g) => g.courseIds.some((id) => !courseIds.has(id)));
      })();

    if (stampedMismatch || hasOrphanedCourseId) {
      resetGroupsForSemesterMismatch();
    }
  }, [status, semester, courses, groups, builtForSemesterCode, resetGroupsForSemesterMismatch]);

  return semesterMismatchDetected;
}
