import { describe, expect, it } from "vitest";

import { blocksOverlap, hasConflict, timeToMinutes, toTimeBlocks, type TimeBlock } from "../conflict";
import type { ScheduleRow } from "../types";

function block(dayOfWeek: number, start: string, end: string): TimeBlock {
  return { dayOfWeek, startMinutes: timeToMinutes(start), endMinutes: timeToMinutes(end) };
}

describe("timeToMinutes", () => {
  it("parses HH:MM", () => {
    expect(timeToMinutes("15:00")).toBe(900);
  });

  it("parses HH:MM:SS (mysql2 TIME format)", () => {
    expect(timeToMinutes("16:30:00")).toBe(990);
  });
});

describe("blocksOverlap", () => {
  it("different days never overlap even with identical times", () => {
    expect(blocksOverlap(block(2, "15:00", "16:30"), block(4, "15:00", "16:30"))).toBe(false);
  });

  it("same day, overlapping ranges", () => {
    expect(blocksOverlap(block(2, "13:00", "16:00"), block(2, "12:00", "13:30"))).toBe(true);
  });

  it("same day, identical ranges", () => {
    expect(blocksOverlap(block(2, "10:30", "12:00"), block(2, "10:30", "12:00"))).toBe(true);
  });

  it("adjacent, touching exactly at the boundary is NOT a conflict", () => {
    expect(blocksOverlap(block(2, "12:00", "13:30"), block(2, "13:30", "15:00"))).toBe(false);
  });

  it("same day, no overlap with a gap between them", () => {
    expect(blocksOverlap(block(5, "13:00", "16:00"), block(5, "16:30", "18:00"))).toBe(false);
  });

  it("one block fully contained inside another", () => {
    expect(blocksOverlap(block(1, "09:00", "18:00"), block(1, "12:00", "13:00"))).toBe(true);
  });
});

describe("hasConflict", () => {
  it("false when no pair overlaps", () => {
    const a = [block(1, "09:00", "10:30")];
    const b = [block(2, "09:00", "10:30"), block(3, "13:00", "14:30")];
    expect(hasConflict(a, b)).toBe(false);
  });

  it("true if any single pair overlaps", () => {
    const a = [block(1, "09:00", "10:30"), block(2, "15:00", "16:30")];
    const b = [block(2, "16:00", "17:30")];
    expect(hasConflict(a, b)).toBe(true);
  });

  it("empty block lists never conflict", () => {
    expect(hasConflict([], [block(1, "09:00", "10:30")])).toBe(false);
    expect(hasConflict([], [])).toBe(false);
  });
});

describe("toTimeBlocks", () => {
  function schedule(overrides: Partial<ScheduleRow>): ScheduleRow {
    return {
      dayOfWeek: 2,
      periodStart: "7",
      periodEnd: "8",
      startTime: "15:00:00",
      endTime: "16:30:00",
      classroom: "342",
      rawText: "화, 목 7교시(15:00) ~ 8교시(16:30)",
      ...overrides,
    };
  }

  it("converts well-formed rows", () => {
    const blocks = toTimeBlocks([schedule({}), schedule({ dayOfWeek: 4 })]);
    expect(blocks).toEqual([
      { dayOfWeek: 2, startMinutes: 900, endMinutes: 990, classroom: "342" },
      { dayOfWeek: 4, startMinutes: 900, endMinutes: 990, classroom: "342" },
    ]);
  });

  it("drops rows with a null dayOfWeek (unparsed schedule_raw)", () => {
    const blocks = toTimeBlocks([schedule({ dayOfWeek: null, startTime: null, endTime: null })]);
    expect(blocks).toEqual([]);
  });

  it("drops rows with null start/end time even if dayOfWeek is present", () => {
    const blocks = toTimeBlocks([schedule({ startTime: null })]);
    expect(blocks).toEqual([]);
  });
});
