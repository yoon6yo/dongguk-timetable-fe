import type { ScheduleRow } from "./types";

export interface TimeBlock {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  /** Raw ROOM_KOR_DSC text, kept unparsed here — see buildingCoordinates.ts's
   * extractBuildingName() for the one place that interprets it. Optional so
   * every existing call site/test building a TimeBlock by hand still compiles. */
  classroom?: string | null;
}

/** "HH:MM" or "HH:MM:SS" (mysql2 returns TIME columns as the latter) -> minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Converts a course's schedule rows into conflict-checkable blocks, dropping
 * any row where parsing failed (dayOfWeek/startTime/endTime null — see
 * db schema notes) since those must never participate in conflict math.
 */
export function toTimeBlocks(schedules: ScheduleRow[]): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  for (const s of schedules) {
    if (s.dayOfWeek == null || !s.startTime || !s.endTime) continue;
    blocks.push({
      dayOfWeek: s.dayOfWeek,
      startMinutes: timeToMinutes(s.startTime),
      endMinutes: timeToMinutes(s.endTime),
      classroom: s.classroom,
    });
  }
  return blocks;
}

/** Half-open interval overlap on the same day: [start, end). Touching at a
 * boundary (one ends exactly when the other starts) is NOT a conflict. */
export function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function hasConflict(a: TimeBlock[], b: TimeBlock[]): boolean {
  for (const blockA of a) {
    for (const blockB of b) {
      if (blocksOverlap(blockA, blockB)) return true;
    }
  }
  return false;
}
