import type { CourseGroup } from "@/store/groupsStore";

import type { Group } from "./combinationGenerator";
import { toTimeBlocks, type TimeBlock } from "./conflict";
import type { CourseRow } from "./types";

export interface GenerationInput {
  groups: Group[];
  blocksByCourseId: Map<string, TimeBlock[]>;
}

/**
 * Bridges the persisted groupsStore shape (course *ids*, since that's what
 * survives a localStorage round-trip) to combinationGenerator's Group shape
 * (fully-resolved candidates with their schedule blocks already parsed out).
 *
 * A courseId a group references that no longer exists in the fetched catalog
 * (e.g. localStorage from a previous semester) is silently dropped rather
 * than crashing — the group just has one fewer candidate.
 */
export function buildGenerationInput(groups: CourseGroup[], courses: CourseRow[]): GenerationInput {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const blocksByCourseId = new Map<string, TimeBlock[]>();

  const generatorGroups: Group[] = groups.map((group) => {
    const candidates = group.courseIds.flatMap((courseId) => {
      const course = courseById.get(courseId);
      if (!course) return [];

      const key = String(course.id);
      const blocks = toTimeBlocks(course.schedules);
      blocksByCourseId.set(key, blocks);
      return [{ courseId: key, blocks }];
    });

    return { id: group.id, required: group.required, candidates };
  });

  return { groups: generatorGroups, blocksByCourseId };
}
