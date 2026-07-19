import { describe, expect, it } from "vitest";

import { getCompetitionRate } from "../competitionRate";

describe("getCompetitionRate", () => {
  // `enrolled` (SESN_SEM_TKCRS_AMT) turned out not to be a headcount field —
  // real captured values are large round multiples of 30000 unrelated to
  // capacity, "AMT" meaning amount/fee, not person count. So real data is
  // never trusted right now (ENROLLED_FIELD_TRUSTED = false in the source)
  // even when capacity looks like a plausible real class size — every course
  // gets the mock until BE re-maps `enrolled` to an actual headcount field.
  it("always mocks for now, even when capacity looks like real data", () => {
    const result = getCompetitionRate({ id: 1, capacity: 30, enrolled: 15 });
    expect(result.isMock).toBe(true);
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

  it("still mocks even when enrolled is legitimately 0 with a positive capacity", () => {
    const result = getCompetitionRate({ id: 1, capacity: 30, enrolled: 0 });
    expect(result.isMock).toBe(true);
  });
});
