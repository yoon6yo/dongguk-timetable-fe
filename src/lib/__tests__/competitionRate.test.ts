import { describe, expect, it } from "vitest";

import { getCompetitionRate } from "../competitionRate";

describe("getCompetitionRate", () => {
  // `appliedCount` (BE's applied_count, from EdcRegi105's 희망강의신청 screen)
  // is the real live headcount now — see competitionRate.ts's module docstring
  // for the HAR evidence. It's only trusted when present; that screen isn't
  // open year-round, so a null appliedCount always falls back to the mock.
  it("uses real data when capacity and appliedCount are both present", () => {
    const result = getCompetitionRate({ id: 1, capacity: 30, appliedCount: 15 });
    expect(result).toEqual({ capacity: 30, enrolled: 15, ratePercent: 50, isMock: false });
  });

  it("falls back to a mock when appliedCount is null (희망강의신청 screen closed)", () => {
    const result = getCompetitionRate({ id: 1, capacity: 30, appliedCount: null });
    expect(result.isMock).toBe(true);
  });

  it("falls back to a mock when capacity is 0 (pre-registration snapshot)", () => {
    const result = getCompetitionRate({ id: 1, capacity: 0, appliedCount: 0 });
    expect(result.isMock).toBe(true);
  });

  it("falls back to a mock when capacity is null", () => {
    const result = getCompetitionRate({ id: 1, capacity: null, appliedCount: null });
    expect(result.isMock).toBe(true);
  });

  it("mock capacity/enrolled stay within plausible, always-positive bounds", () => {
    for (let id = 0; id < 200; id++) {
      const result = getCompetitionRate({ id, capacity: 0, appliedCount: 0 });
      expect(result.capacity).toBeGreaterThanOrEqual(20);
      expect(result.capacity).toBeLessThan(60);
      expect(result.enrolled).toBeGreaterThanOrEqual(0);
      expect(result.ratePercent).toBe(Math.round((result.enrolled / result.capacity) * 100));
    }
  });

  it("is deterministic for the same course id", () => {
    const a = getCompetitionRate({ id: 42, capacity: 0, appliedCount: null });
    const b = getCompetitionRate({ id: 42, capacity: 0, appliedCount: null });
    expect(a).toEqual(b);
  });

  it("varies across different course ids (not a constant placeholder)", () => {
    const rates = new Set(
      Array.from({ length: 20 }, (_, id) => getCompetitionRate({ id, capacity: 0, appliedCount: null }).ratePercent)
    );
    expect(rates.size).toBeGreaterThan(1);
  });

  it("real appliedCount of 0 is trusted as-is, not treated as missing", () => {
    const result = getCompetitionRate({ id: 1, capacity: 30, appliedCount: 0 });
    expect(result).toEqual({ capacity: 30, enrolled: 0, ratePercent: 0, isMock: false });
  });
});
