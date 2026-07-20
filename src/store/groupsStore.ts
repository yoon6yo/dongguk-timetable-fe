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
  /** name is optional — naming a group is a nice-to-have, not a required
   * step. An omitted/blank name stays blank (see groupDisplayName for how
   * it's shown), rather than committing a "그룹 N" placeholder as real data. */
  addGroup: (name?: string) => void;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  toggleRequired: (id: string) => void;
  addCourseToGroup: (groupId: string, courseId: number) => void;
  removeCourseFromGroup: (groupId: string, courseId: number) => void;
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

      addCourseToGroup: (groupId, courseId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId && !g.courseIds.includes(courseId)
              ? { ...g, courseIds: [...g.courseIds, courseId] }
              : g
          ),
        })),

      removeCourseFromGroup: (groupId, courseId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, courseIds: g.courseIds.filter((id) => id !== courseId) } : g
          ),
        })),
    }),
    { name: "timetable-groups" }
  )
);
