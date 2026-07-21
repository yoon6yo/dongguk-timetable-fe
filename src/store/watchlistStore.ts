import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistState {
  courseIds: number[];
  addCourse: (courseId: number) => void;
  removeCourse: (courseId: number) => void;
}

/** Courses the user wants to track competition rate for, independent of any
 * timetable group -- e.g. a course they're on the fence about but haven't
 * committed to a group yet. courseIds that stop resolving against the live
 * catalog (semester rollover) just silently drop out of the rendered list;
 * unlike groupsStore this has no combination-generation step downstream that
 * a stale id could break, so no separate mismatch-detection/reset is needed. */
export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      courseIds: [],

      addCourse: (courseId) =>
        set((state) => ({
          courseIds: state.courseIds.includes(courseId) ? state.courseIds : [...state.courseIds, courseId],
        })),

      removeCourse: (courseId) =>
        set((state) => ({ courseIds: state.courseIds.filter((id) => id !== courseId) })),
    }),
    { name: "timetable-watchlist" }
  )
);
