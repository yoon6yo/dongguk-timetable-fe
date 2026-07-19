import { describe, expect, it } from "vitest";

import { activeDayColumns, computeGridLayout, formatScheduleTime, rowRange } from "../timeGrid";

describe("formatScheduleTime", () => {
  it("truncates HH:MM:SS to HH:MM", () => {
    expect(formatScheduleTime("16:30:00")).toBe("16:30");
  });

  it("passes through HH:MM unchanged", () => {
    expect(formatScheduleTime("09:00")).toBe("09:00");
  });

  it("returns null for null input", () => {
    expect(formatScheduleTime(null)).toBeNull();
  });
});

describe("computeGridLayout", () => {
  it("defaults to 09:00-18:00 when given no blocks", () => {
    const layout = computeGridLayout([]);
    expect(layout).toEqual({ startMinutes: 540, endMinutes: 1080, slotMinutes: 30, totalRows: 18 });
  });

  it("widens the start when a block begins earlier than the default", () => {
    const layout = computeGridLayout([{ startMinutes: 8 * 60, endMinutes: 9 * 60 }]);
    expect(layout.startMinutes).toBe(8 * 60);
  });

  it("widens the end when a block finishes later than the default", () => {
    const layout = computeGridLayout([{ startMinutes: 17 * 60, endMinutes: 20 * 60 }]);
    expect(layout.endMinutes).toBe(20 * 60);
  });

  it("never narrows below the 09:00-18:00 default even with only midday blocks", () => {
    const layout = computeGridLayout([{ startMinutes: 12 * 60, endMinutes: 13 * 60 }]);
    expect(layout.startMinutes).toBe(9 * 60);
    expect(layout.endMinutes).toBe(18 * 60);
  });

  it("rounds outward to the slot size", () => {
    const layout = computeGridLayout([{ startMinutes: 8 * 60 + 10, endMinutes: 19 * 60 + 40 }]);
    expect(layout.startMinutes).toBe(8 * 60); // floors down
    expect(layout.endMinutes).toBe(20 * 60); // ceils up
  });
});

describe("rowRange", () => {
  const layout = computeGridLayout([]); // 09:00 start, 30-min slots

  it("places a class starting at the grid's start at row 1", () => {
    expect(rowRange({ startMinutes: 9 * 60, endMinutes: 10 * 60 }, layout)).toEqual({ start: 1, span: 2 });
  });

  it("computes span from duration in slot units", () => {
    // 15:00-16:30 = 90 min = 3 slots
    expect(rowRange({ startMinutes: 15 * 60, endMinutes: 16 * 60 + 30 }, layout).span).toBe(3);
  });

  it("rounds a fractional-slot duration up rather than truncating", () => {
    // 10:00-10:40 = 40 min -> should span 2 slots (30 wouldn't fit it), not 1
    expect(rowRange({ startMinutes: 10 * 60, endMinutes: 10 * 60 + 40 }, layout).span).toBe(2);
  });
});

describe("activeDayColumns", () => {
  it("always includes Mon-Fri even with no blocks", () => {
    expect(activeDayColumns([])).toEqual([1, 2, 3, 4, 5]);
  });

  it("adds Saturday only when a Saturday block exists", () => {
    expect(activeDayColumns([{ dayOfWeek: 6 }])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("adds Sunday only when a Sunday block exists", () => {
    expect(activeDayColumns([{ dayOfWeek: 7 }])).toEqual([1, 2, 3, 4, 5, 7]);
  });

  it("does not duplicate weekday columns", () => {
    expect(activeDayColumns([{ dayOfWeek: 2 }, { dayOfWeek: 2 }])).toEqual([1, 2, 3, 4, 5]);
  });
});
