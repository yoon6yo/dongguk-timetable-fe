import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CourseGroup {
  id: string;
  name: string;
  /** true = must pick exactly one candidate; false = may pick zero or one. */
  required: boolean;
  courseIds: number[];
}

/** Falls back to "그룹 N" (1-indexed by creation order) for *display* only —
 * a freshly created group's stored name stays empty, so the UI can show this
 * as a placeholder (grayed-out hint text) instead of baking it into the real
 * value, which read like an unfinished default the user forgot to edit. */
export function groupDisplayName(group: CourseGroup, index: number): string {
  return group.name.trim() || `그룹 ${index + 1}`;
}

interface GroupsState {
  groups: CourseGroup[];
  /** semesterCode of the catalog the groups were last built against — stamped
   * by addCourseToGroup when a semesterCode is supplied. Compared against the
   * live semester by useSemesterMismatchGuard to detect a stale snapshot from
   * a prior semester and trigger a reset. null until the first course is ever
   * added, or after a reset. */
  builtForSemesterCode: string | null;
  /** Set by resetGroupsForSemesterMismatch (not the generic resetGroups) so
   * useSemesterMismatchGuard can derive its notice-banner flag directly from
   * this store selector during render, rather than local React state/refs
   * (both of which the "you-might-not-need-an-effect" lint rules reject for
   * this exact pattern). Stays true for the rest of the session once set. */
  semesterMismatchDetected: boolean;
  /** name is optional — naming a group is a nice-to-have, not a required
   * step. An omitted/blank name stays blank (see groupDisplayName for how
   * it's shown), rather than committing a "그룹 N" placeholder as real data. */
  addGroup: (name?: string) => void;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  toggleRequired: (id: string) => void;
  addCourseToGroup: (groupId: string, courseId: number, semesterCode?: string) => void;
  removeCourseFromGroup: (groupId: string, courseId: number) => void;
  moveCourseBetweenGroups: (fromGroupId: string, toGroupId: string, courseId: number) => void;
  resetGroups: () => void;
  resetGroupsForSemesterMismatch: () => void;
}

function makeGroupId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set) => ({
      groups: [],
      builtForSemesterCode: null,
      semesterMismatchDetected: false,

      addGroup: (name) =>
        set((state) => ({
          groups: [
            ...state.groups,
            { id: makeGroupId(), name: name?.trim() ?? "", required: true, courseIds: [] },
          ],
        })),

      removeGroup: (id) => set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

      renameGroup: (id, name) =>
        set((state) => ({ groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)) })),

      toggleRequired: (id) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, required: !g.required } : g)),
        })),

      addCourseToGroup: (groupId, courseId, semesterCode) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId && !g.courseIds.includes(courseId)
              ? { ...g, courseIds: [...g.courseIds, courseId] }
              : g
          ),
          builtForSemesterCode: semesterCode ?? state.builtForSemesterCode,
        })),

      removeCourseFromGroup: (groupId, courseId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, courseIds: g.courseIds.filter((id) => id !== courseId) } : g
          ),
        })),

      moveCourseBetweenGroups: (fromGroupId, toGroupId, courseId) =>
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id === fromGroupId && g.id !== toGroupId) {
              return { ...g, courseIds: g.courseIds.filter((id) => id !== courseId) };
            }
            if (g.id === toGroupId && !g.courseIds.includes(courseId)) {
              return { ...g, courseIds: [...g.courseIds, courseId] };
            }
            return g;
          }),
        })),

      resetGroups: () => set({ groups: [], builtForSemesterCode: null }),

      resetGroupsForSemesterMismatch: () =>
        set({ groups: [], builtForSemesterCode: null, semesterMismatchDetected: true }),
    }),
    { name: "timetable-groups" }
  )
);
