import { describe, expect, it } from "vitest";

import { courseBackgroundColor, courseColorIndex, courseTextColor } from "../courseColor";

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
