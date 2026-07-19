import { distanceBetweenBuildingNames, extractBuildingName } from "./buildingCoordinates";
import type { TimeBlock } from "./conflict";

/**
 * All five sliders are 0-100, user-adjusted directly (see project plan §5).
 * `timeOfDay` does double duty: its value is both the *target* position
 * (0 = strong morning preference, 50 = neutral, 100 = strong afternoon
 * preference) and, via distance-from-neutral, its own *importance* in the
 * weighted total — leaving it at 50 means "I don't care", matching the
 * intuitive act of not touching the slider. The other four are plain
 * 0-100 importance weights.
 */
export interface Weights {
  gap: number;
  lunch: number;
  freeDay: number;
  timeOfDay: number;
  commute: number;
}

export interface ScoreBreakdown {
  gap: number;
  lunch: number;
  freeDay: number;
  timeOfDay: number;
  commute: number;
  total: number;
}

const WEEKDAYS = [1, 2, 3, 4, 5] as const;
const LUNCH_WINDOW = { start: 12 * 60, end: 13 * 60 }; // 12:00–13:00
const GAP_REFERENCE_MINUTES = 600; // 10h/week of idle time treated as "as bad as it gets" (score floors at 0)
const DAY_RANGE = { start: 9 * 60, end: 21 * 60 }; // 09:00–21:00, for normalizing "average start time"
// Straight-line meters/week of building-to-building walking treated as "as
// bad as it gets" (score floors at 0). Campus is compact (~500m across), so a
// full week of back-to-back cross-campus transitions tops out well under
// this — approximate on purpose, see buildingCoordinates.ts.
const COMMUTE_REFERENCE_METERS = 3000;

function groupByDay(blocks: TimeBlock[]): Map<number, TimeBlock[]> {
  const byDay = new Map<number, TimeBlock[]>();
  for (const block of blocks) {
    const list = byDay.get(block.dayOfWeek) ?? [];
    list.push(block);
    byDay.set(block.dayOfWeek, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startMinutes - b.startMinutes);
  }
  return byDay;
}

function gapScoreFromGroups(byDay: Map<number, TimeBlock[]>): number {
  let totalGap = 0;
  for (const dayBlocks of byDay.values()) {
    for (let i = 1; i < dayBlocks.length; i++) {
      totalGap += Math.max(0, dayBlocks[i].startMinutes - dayBlocks[i - 1].endMinutes);
    }
  }
  return clamp(100 * (1 - totalGap / GAP_REFERENCE_MINUTES));
}

/** Sum of idle minutes between consecutive classes on the same day, across the week. */
export function computeGapScore(blocks: TimeBlock[]): number {
  return gapScoreFromGroups(groupByDay(blocks));
}

function lunchScoreFromGroups(byDay: Map<number, TimeBlock[]>): number {
  if (byDay.size === 0) return 100;

  let lunchFreeDays = 0;
  for (const dayBlocks of byDay.values()) {
    const overlapsLunch = dayBlocks.some(
      (b) => b.startMinutes < LUNCH_WINDOW.end && LUNCH_WINDOW.start < b.endMinutes
    );
    if (!overlapsLunch) lunchFreeDays++;
  }
  return (100 * lunchFreeDays) / byDay.size;
}

/** % of days-with-at-least-one-class that don't have anything overlapping the lunch window. */
export function computeLunchScore(blocks: TimeBlock[]): number {
  return lunchScoreFromGroups(groupByDay(blocks));
}

/** % of Mon–Fri with no classes at all (Sat/Sun classes don't count against this). */
export function computeFreeDayScore(blocks: TimeBlock[]): number {
  const usedWeekdays = new Set(blocks.map((b) => b.dayOfWeek).filter((d) => (WEEKDAYS as readonly number[]).includes(d)));
  const freeWeekdays = WEEKDAYS.length - usedWeekdays.size;
  return (100 * freeWeekdays) / WEEKDAYS.length;
}

/** How close the combination's average class-start time is to the user's target position. */
export function computeTimeOfDayScore(blocks: TimeBlock[], target: number): number {
  if (blocks.length === 0) return 100;
  const avgStart = blocks.reduce((sum, b) => sum + b.startMinutes, 0) / blocks.length;
  const position = clamp((100 * (avgStart - DAY_RANGE.start)) / (DAY_RANGE.end - DAY_RANGE.start));
  return clamp(100 - Math.abs(position - target));
}

function commuteScoreFromGroups(byDay: Map<number, TimeBlock[]>): number {
  let totalMeters = 0;
  for (const dayBlocks of byDay.values()) {
    // Resolve each block's building name once per day rather than twice per
    // transition (once as a destination, once as the next transition's origin).
    const buildingNames = dayBlocks.map((b) => extractBuildingName(b.classroom));
    for (let i = 1; i < dayBlocks.length; i++) {
      const distance = distanceBetweenBuildingNames(buildingNames[i - 1], buildingNames[i]);
      if (distance != null) totalMeters += distance;
    }
  }
  return clamp(100 * (1 - totalMeters / COMMUTE_REFERENCE_METERS));
}

/** Sum of straight-line building-to-building distance between consecutive
 * classes on the same day, across the week. Transitions where either class's
 * building can't be resolved (unrecognized/missing classroom text) are
 * skipped rather than penalized, since "unknown" isn't evidence of a long walk. */
export function computeCommuteScore(blocks: TimeBlock[]): number {
  return commuteScoreFromGroups(groupByDay(blocks));
}

export function scoreCombination(blocks: TimeBlock[], weights: Weights): ScoreBreakdown {
  // Grouped once and shared across gap/lunch/commute instead of each
  // independently re-bucketing and re-sorting the same blocks by day.
  const byDay = groupByDay(blocks);
  const gap = gapScoreFromGroups(byDay);
  const lunch = lunchScoreFromGroups(byDay);
  const freeDay = computeFreeDayScore(blocks);
  const timeOfDay = computeTimeOfDayScore(blocks, weights.timeOfDay);
  const commute = commuteScoreFromGroups(byDay);

  const timeOfDayImportance = Math.abs(weights.timeOfDay - 50) * 2;
  const totalImportance = weights.gap + weights.lunch + weights.freeDay + weights.commute + timeOfDayImportance;

  const total =
    totalImportance === 0
      ? (gap + lunch + freeDay + timeOfDay + commute) / 5 // nobody cares about anything -> plain average, not 0
      : (gap * weights.gap +
          lunch * weights.lunch +
          freeDay * weights.freeDay +
          commute * weights.commute +
          timeOfDay * timeOfDayImportance) /
        totalImportance;

  return { gap, lunch, freeDay, timeOfDay, commute, total };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
