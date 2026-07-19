import { describe, expect, it } from "vitest";

import { getCompetitionRate } from "../competitionRate";

describe("getCompetitionRate", () => {
  it("uses real data and is not marked as mock when capacity is positive", () => {
    const result = getCompetitionRate({ id: 1, capacity: 30, enrolled: 15 });
    expect(result).toEqual({ capacity: 30, enrolled: 15, ratePercent: 50, isMock: false });
  });

  it("falls back to a mock when capacity is 0 (pre-registration snapshot)", () => {
    const result = getCompetitionRate({ id: 1, capacity: 0, enrolled: 0 });
    expect(result.isMock).toBe(true);
  });

  it("falls back to a mock when capacity is null", () => {
    const result = getCompetitionRate({ id: 1, capacity: null, enrolled: null });
    expect(result.isMock).toBe(true);
  });

  it("mock capacity/enrolled stay within plausible, always-positive bounds", () => {
    for (let id = 0; id < 200; id++) {
      const result = getCompetitionRate({ id, capacity: 0, enrolled: 0 });
      expect(result.capacity).toBeGreaterThanOrEqual(20);
      expect(result.capacity).toBeLessThan(60);
      expect(result.enrolled).toBeGreaterThanOrEqual(0);
      expect(result.ratePercent).toBe(Math.round((result.enrolled / result.capacity) * 100));
    }
  });

  it("is deterministic for the same course id", () => {
    const a = getCompetitionRate({ id: 42, capacity: 0, enrolled: 0 });
    const b = getCompetitionRate({ id: 42, capacity: 0, enrolled: 0 });
    expect(a).toEqual(b);
  });

  it("varies across different course ids (not a constant placeholder)", () => {
    const rates = new Set(
      Array.from({ length: 20 }, (_, id) => getCompetitionRate({ id, capacity: 0, enrolled: 0 }).ratePercent)
    );
    expect(rates.size).toBeGreaterThan(1);
  });

  it("treats enrolled=0 with positive real capacity as a real 0%, not a mock", () => {
    const result = getCompetitionRate({ id: 1, capacity: 30, enrolled: 0 });
    expect(result).toEqual({ capacity: 30, enrolled: 0, ratePercent: 0, isMock: false });
  });
});
