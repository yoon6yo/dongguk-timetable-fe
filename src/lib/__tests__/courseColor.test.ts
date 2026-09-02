import { describe, expect, it } from "vitest";

import { assignCourseColors, courseBackgroundColor, courseColorIndex, courseTextColor, slotBackgroundColor, slotTextColor } from "../courseColor";

describe("courseColorIndex", () => {
  it("stays within the 8-slot range", () => {
    for (let id = 0; id < 100; id++) {
      const idx = courseColorIndex(id);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(8);
    }
  });

  it("is deterministic for the same id", () => {
    expect(courseColorIndex(1733)).toBe(courseColorIndex(1733));
  });

  it("assigns the same slot to ids exactly 8 apart", () => {
    expect(courseColorIndex(5)).toBe(courseColorIndex(13));
  });
});

describe("courseBackgroundColor", () => {
  it("returns a CSS var reference for the assigned slot", () => {
    expect(courseBackgroundColor(0)).toBe("var(--series-1)");
    expect(courseBackgroundColor(1)).toBe("var(--series-2)");
  });
});

describe("courseTextColor", () => {
  it("returns a valid hex color for every slot", () => {
    for (let id = 0; id < 8; id++) {
      expect(courseTextColor(id)).toMatch(/^#([0-9a-f]{6})$/);
    }
  });

  it("is consistent for the same course id as courseColorIndex", () => {
    expect(courseTextColor(1)).toBe(courseTextColor(9)); // same slot (1 % 8 === 9 % 8)
  });
});

describe("assignCourseColors", () => {
  it("gives every course its own slot when two ids would otherwise collide (regression: plain % 8 painted them the same color)", () => {
    // 1 % 8 === 9 % 8 === 1 -- exactly the "same color, different course" bug
    const assignment = assignCourseColors([1, 9]);
    expect(assignment.get(1)).not.toBe(assignment.get(9));
  });

  it("assigns unique slots for any set of at most 8 distinct courses, regardless of id spacing", () => {
    for (const ids of [
      [1, 9, 17, 25],
      [3, 4, 5, 6, 7],
      [8, 16, 24, 32, 40, 48, 56, 64], // all identical mod 8
    ]) {
      const assignment = assignCourseColors(ids);
      const slots = ids.map((id) => assignment.get(id));
      expect(new Set(slots).size).toBe(ids.length);
    }
  });

  it("keeps each course's natural slot when there's no collision to resolve", () => {
    const assignment = assignCourseColors([2, 20]); // 2 % 8 = 2, 20 % 8 = 4 -- no clash
    expect(assignment.get(2)).toBe(courseColorIndex(2));
    expect(assignment.get(20)).toBe(courseColorIndex(20));
  });

  it("gives the lower id priority for a contested slot; the higher id probes forward", () => {
    // both 1 and 9 prefer slot 1 -- ascending processing order means 1 keeps it
    const assignment = assignCourseColors([9, 1]);
    expect(assignment.get(1)).toBe(1);
    expect(assignment.get(9)).toBe(2); // next free slot after probing
  });

  it("is deterministic and order-independent for the same set of ids", () => {
    expect(assignCourseColors([9, 1, 17])).toEqual(assignCourseColors([1, 17, 9]));
  });

  it("ignores duplicate ids in the input", () => {
    const assignment = assignCourseColors([5, 5, 5]);
    expect(assignment.size).toBe(1);
  });

  it("falls back to reuse only once distinct courses exceed the 8 slots (unavoidable by pigeonhole)", () => {
    const assignment = assignCourseColors([0, 1, 2, 3, 4, 5, 6, 7, 8]); // 9 distinct ids
    expect(assignment.size).toBe(9);
    expect(new Set(assignment.values()).size).toBeLessThanOrEqual(8);
  });
});

describe("slotBackgroundColor / slotTextColor", () => {
  it("returns a CSS var reference matching the slot index", () => {
    expect(slotBackgroundColor(0)).toBe("var(--series-1)");
    expect(slotBackgroundColor(2)).toBe("var(--series-3)");
  });

  it("matches courseBackgroundColor/courseTextColor for that course's natural slot", () => {
    expect(slotBackgroundColor(courseColorIndex(5))).toBe(courseBackgroundColor(5));
    expect(slotTextColor(courseColorIndex(5))).toBe(courseTextColor(5));
  });
});
