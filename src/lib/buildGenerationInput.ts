import type { CourseGroup } from "@/store/groupsStore";

import type { Group } from "./combinationGenerator";
import { toTimeBlocks, type TimeBlock } from "./conflict";
import type { CourseRow } from "./types";

export interface GenerationInput {
  groups: Group[];
  blocksByCourseId: Map<string, TimeBlock[]>;
  creditByCourseId: Map<string, number>;
}

/**
 * Bridges the persisted groupsStore shape (course *ids*, since that's what
 * survives a localStorage round-trip) to combinationGenerator's Group shape
 * (fully-resolved candidates with their schedule blocks and credit already parsed out).
 *
 * A courseId a group references that no longer exists in the fetched catalog
 * (e.g. localStorage from a previous semester) is silently dropped rather
 * than crashing — the group just has one fewer candidate.
 *
 * `customEvents` (personal, non-course time blocks, already synthesized as
 * CourseRow-shaped objects by lib/customEvents.ts) are each folded in as
 * their own required, single-candidate group -- so every combination
 * conflict-checks against them on equal footing with real courses, and
 * dropping one is never an option (unlike an optional course group).
 */
export function buildGenerationInput(
  groups: CourseGroup[],
  courses: CourseRow[],
  customEvents: CourseRow[] = []
): GenerationInput {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const blocksByCourseId = new Map<string, TimeBlock[]>();
  const creditByCourseId = new Map<string, number>();

  const generatorGroups: Group[] = groups.map((group) => {
    const candidates = group.courseIds.flatMap((courseId) => {
      const course = courseById.get(courseId);
      if (!course) return [];

      const key = String(course.id);
      const blocks = toTimeBlocks(course.schedules);
      const credit = parseCredit(course.credit);
      blocksByCourseId.set(key, blocks);
      creditByCourseId.set(key, credit);
      return [{ courseId: key, blocks, credit }];
    });

    return { id: group.id, required: group.required, candidates };
  });

  for (const event of customEvents) {
    const key = String(event.id);
    const blocks = toTimeBlocks(event.schedules);
    blocksByCourseId.set(key, blocks);
    creditByCourseId.set(key, 0);
    generatorGroups.push({
      id: `custom-event-group-${key}`,
      required: true,
      candidates: [{ courseId: key, blocks, credit: 0 }],
    });
  }

  return { groups: generatorGroups, blocksByCourseId, creditByCourseId };
}

/** `courses.credit` is a DB DECIMAL surfaced as a string (e.g. "3.0") — an
 * unparsed/missing value falls back to 0 rather than propagating NaN into
 * the credit-cap arithmetic. */
function parseCredit(credit: string): number {
  const parsed = Number(credit);
  return Number.isFinite(parsed) ? parsed : 0;
}
