/**
 * `capacity` (TKCRS_PCNT) looks reliable now that real 수강신청-period data
 * has come in — plausible class sizes (1-30ish), including tiny 1-3 seat
 * 개별연구 sections.
 *
 * `enrolled` (SESN_SEM_TKCRS_AMT), however, does NOT look like an enrollment
 * headcount in the real data: values are large round multiples of 30000
 * (e.g. 270000, 210000, 420000) with no relation to capacity — "AMT" in the
 * raw field name means "amount" (probably a fee), not a person count. Using
 * it as-is would show nonsensical "경쟁률" numbers as if they were real. So
 * this ALWAYS mocks both capacity and enrolled for now, regardless of what
 * BE sends, until BE re-maps `enrolled` to a real headcount field (see BE
 * STATUS.md / docs/ndrims-response-notes.md) — flip the condition below back
 * on once that's confirmed fixed.
 */
export interface CompetitionRate {
  capacity: number;
  enrolled: number;
  ratePercent: number;
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

const ENROLLED_FIELD_TRUSTED = false;

export function getCompetitionRate(course: {
  id: number;
  capacity: number | null;
  enrolled: number | null;
}): CompetitionRate {
  if (ENROLLED_FIELD_TRUSTED && course.capacity != null && course.capacity > 0) {
    const capacity = course.capacity;
    const enrolled = course.enrolled ?? 0;
    return { capacity, enrolled, ratePercent: Math.round((enrolled / capacity) * 100), isMock: false };
  }

  const capacity = 20 + Math.floor(seededFraction(course.id) * 40); // 20..59
  const enrolled = Math.round(capacity * (0.2 + seededFraction(course.id + 1) * 1.3)); // ~20%..150% of capacity
  return { capacity, enrolled, ratePercent: Math.round((enrolled / capacity) * 100), isMock: true };
}
