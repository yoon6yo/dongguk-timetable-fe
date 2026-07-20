/**
 * `capacity` (TKCRS_PCNT from BE's EdcLesn010 crawl) looks reliable now that
 * real 수강신청-period data has come in — plausible class sizes (1-30ish),
 * including tiny 1-3 seat 개별연구 sections.
 *
 * `enrolled` (SESN_SEM_TKCRS_AMT) does NOT look like an enrollment headcount:
 * values are large round multiples of 30000 (e.g. 270000, 210000, 420000)
 * with no relation to capacity — "AMT" in the raw field name means "amount"
 * (probably a fee), not a person count. This field is never used here.
 *
 * `appliedCount` (BE's `applied_count`, sourced from a *different* nDRIMS
 * screen — EdcRegi105's 희망강의신청, not EdcLesn010) is the real live
 * headcount: real HAR evidence showed it exceeding capacity for popular
 * electives (up to ~2x), which only makes sense for a demand count, never a
 * capacity. See BE's docs/ndrims-response-notes.md for the full writeup.
 * That screen isn't open year-round, so `appliedCount` is null whenever the
 * last successful crawl couldn't reach it — always mock in that case.
 */
export interface CompetitionRate {
  capacity: number;
  enrolled: number;
  /** enrolled/capacity as a plain ratio (e.g. 0.78), not a percentage. */
  rate: number;
  /** True when capacity/enrolled are a placeholder, not real crawled data. */
  isMock: boolean;
}

/** Deterministic 0..1 pseudo-random value from an integer seed — same
 * course always renders the same mock numbers within a session/build,
 * instead of reshuffling on every re-render. Not cryptographic, just needs
 * to look plausibly spread out. */
function seededFraction(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Kill switch kept for parity with how the old (wrong) `enrolled` field was
// gated — flip to false to force mocks everywhere without touching the
// branch logic below, if `appliedCount` ever looks wrong in production.
const APPLIED_COUNT_TRUSTED = true;

export function getCompetitionRate(course: {
  id: number;
  capacity: number | null;
  appliedCount: number | null;
}): CompetitionRate {
  if (
    APPLIED_COUNT_TRUSTED &&
    course.capacity != null &&
    course.capacity > 0 &&
    course.appliedCount != null
  ) {
    const capacity = course.capacity;
    const enrolled = course.appliedCount;
    return { capacity, enrolled, rate: roundRate(enrolled / capacity), isMock: false };
  }

  const capacity = 20 + Math.floor(seededFraction(course.id) * 40); // 20..59
  const enrolled = Math.round(capacity * (0.2 + seededFraction(course.id + 1) * 1.3)); // ~20%..150% of capacity
  return { capacity, enrolled, rate: roundRate(enrolled / capacity), isMock: true };
}

/** Two decimal places, e.g. 0.782 -> 0.78 -- matches the "0.78" style display. */
function roundRate(rate: number): number {
  return Math.round(rate * 100) / 100;
}
