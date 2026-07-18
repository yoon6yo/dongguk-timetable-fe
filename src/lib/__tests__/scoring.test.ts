import { describe, expect, it } from "vitest";

import { timeToMinutes, type TimeBlock } from "../conflict";
import {
  computeFreeDayScore,
  computeGapScore,
  computeLunchScore,
  computeTimeOfDayScore,
  scoreCombination,
  type Weights,
} from "../scoring";

function block(dayOfWeek: number, start: string, end: string): TimeBlock {
  return { dayOfWeek, startMinutes: timeToMinutes(start), endMinutes: timeToMinutes(end) };
}

describe("computeGapScore", () => {
  it("is 100 when classes are back-to-back with no gap", () => {
    const blocks = [block(2, "09:00", "10:30"), block(2, "10:30", "12:00")];
    expect(computeGapScore(blocks)).toBe(100);
  });

  it("decreases proportionally to idle minutes", () => {
    // 60 idle minutes out of a 600-minute reference -> 100 * (1 - 60/600) = 90
    const blocks = [block(2, "09:00", "10:00"), block(2, "11:00", "12:00")];
    expect(computeGapScore(blocks)).toBe(90);
  });

  it("clamps at exactly 0 at the reference cap and stays positive just under it", () => {
    // 09:00-10:00 then 20:00-21:00 same day -> exactly 600 idle minutes (the reference cap)
    const atCap = [block(2, "09:00", "10:00"), block(2, "20:00", "21:00")];
    expect(computeGapScore(atCap)).toBe(0);

    // one minute less idle time must not also be floored to 0
    const underCap = [block(2, "09:00", "10:00"), block(2, "19:59", "21:00")];
    expect(computeGapScore(underCap)).toBeGreaterThan(0);
  });

  it("sums gaps across multiple days independently", () => {
    const blocks = [
      block(1, "09:00", "10:00"),
      block(1, "11:00", "12:00"), // 60 min gap on Monday
      block(3, "09:00", "10:00"),
      block(3, "11:00", "12:00"), // 60 min gap on Wednesday
    ];
    // 120 idle minutes total -> 100 * (1 - 120/600) = 80
    expect(computeGapScore(blocks)).toBe(80);
  });

  it("single class or no classes on a day contributes no gap", () => {
    expect(computeGapScore([block(2, "09:00", "10:00")])).toBe(100);
    expect(computeGapScore([])).toBe(100);
  });
});

describe("computeLunchScore", () => {
  it("is 100 when there are no classes at all", () => {
    expect(computeLunchScore([])).toBe(100);
  });

  it("is 100 when no day's classes overlap the lunch window", () => {
    const blocks = [block(2, "09:00", "10:30"), block(4, "14:00", "15:30")];
    expect(computeLunchScore(blocks)).toBe(100);
  });

  it("a class ending exactly at 12:00 does not count as overlapping lunch", () => {
    expect(computeLunchScore([block(2, "10:30", "12:00")])).toBe(100);
  });

  it("a class starting exactly at 13:00 does not count as overlapping lunch", () => {
    expect(computeLunchScore([block(2, "13:00", "14:30")])).toBe(100);
  });

  it("penalizes proportionally per day that overlaps lunch", () => {
    const blocks = [
      block(1, "12:00", "13:30"), // overlaps lunch
      block(3, "09:00", "10:30"), // does not
    ];
    expect(computeLunchScore(blocks)).toBe(50);
  });
});

describe("computeFreeDayScore", () => {
  it("is 100 with no classes (all 5 weekdays free)", () => {
    expect(computeFreeDayScore([])).toBe(100);
  });

  it("weekend classes don't count against weekday freedom", () => {
    expect(computeFreeDayScore([block(6, "09:00", "10:30"), block(7, "09:00", "10:30")])).toBe(100);
  });

  it("scores proportionally to used weekdays", () => {
    // Mon, Wed, Fri used -> 2 of 5 weekdays free -> 40
    const blocks = [block(1, "09:00", "10:30"), block(3, "09:00", "10:30"), block(5, "09:00", "10:30")];
    expect(computeFreeDayScore(blocks)).toBe(40);
  });

  it("multiple classes on the same weekday only count once", () => {
    const blocks = [block(1, "09:00", "10:30"), block(1, "11:00", "12:30")];
    expect(computeFreeDayScore(blocks)).toBe(80); // only Monday used
  });
});

describe("computeTimeOfDayScore", () => {
  it("is 100 with no classes regardless of target", () => {
    expect(computeTimeOfDayScore([], 0)).toBe(100);
    expect(computeTimeOfDayScore([], 100)).toBe(100);
  });

  it("is 100 when the average start time matches the target exactly", () => {
    // 09:00 is the bottom of the 09:00-21:00 range -> position 0
    expect(computeTimeOfDayScore([block(2, "09:00", "10:30")], 0)).toBe(100);
  });

  it("drops the further the average start time is from the target", () => {
    const morningClass = [block(2, "09:00", "10:30")];
    const scoreNearTarget = computeTimeOfDayScore(morningClass, 0);
    const scoreFarFromTarget = computeTimeOfDayScore(morningClass, 100);
    expect(scoreNearTarget).toBeGreaterThan(scoreFarFromTarget);
  });
});

describe("scoreCombination", () => {
  const neutralBlocks = [block(2, "09:00", "10:30"), block(4, "09:00", "10:30")];

  it("falls back to a plain average when every weight is 0/neutral", () => {
    const weights: Weights = { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 50 };
    const result = scoreCombination(neutralBlocks, weights);
    expect(result.total).toBeCloseTo((result.gap + result.lunch + result.freeDay + result.timeOfDay) / 4);
  });

  it("total equals the sub-score exactly when only one weight is nonzero", () => {
    const weights: Weights = { gap: 100, lunch: 0, freeDay: 0, timeOfDay: 50 };
    const result = scoreCombination(neutralBlocks, weights);
    expect(result.total).toBeCloseTo(result.gap);
  });

  it("timeOfDay at an extreme slider value carries full importance", () => {
    const weights: Weights = { gap: 0, lunch: 0, freeDay: 0, timeOfDay: 0 };
    const result = scoreCombination(neutralBlocks, weights);
    expect(result.total).toBeCloseTo(result.timeOfDay);
  });
});
