/**
 * `capacity` (BE's `courses.capacity`, sourced from EdcLesn010's
 * ALL_FULL_PCNT) — that endpoint's TKCRS_PCNT was originally assumed to be
 * capacity, but real full-catalog HAR evidence (2026-07-21) showed it reads
 * 0 for 97.5% of rows. ALL_FULL_PCNT is populated and plausible (23-71
 * range observed) for ~99% of rows and is what BE now reads.
 *
 * `enrolled` (SESN_SEM_TKCRS_AMT) does NOT look like an enrollment headcount:
 * values are large round multiples of 30000 (e.g. 270000, 210000, 420000)
 * with no relation to capacity — "AMT" in the raw field name means "amount"
 * (probably a fee), not a person count. This field is never used here.
 *
 * `appliedCount` (BE's `applied_count`, sourced from a *different* nDRIMS
 * screen — EdcRegi105's 희망강의신청, not EdcLesn010) is the real live
 * headcount, read from that screen's TKCRS_PCNT field (yes, same field name
 * as EdcLesn010's capacity field, but a different endpoint/schema — see
 * BE's docs/ndrims-response-notes.md). It reads 0 early in the registration
 * window before students start applying, then fills in with real counts —
 * that's expected, not a bug. (A TKCRS_BSKT_PCNT field briefly looked more
 * promising from one browser capture, but BE confirmed the crawler's own
 * request never actually receives that field — reverted 2026-07-21.)
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
// gated — flip to false to force enrolled mocks everywhere without touching
// the branch logic below, if `appliedCount` ever looks wrong in production.
const APPLIED_COUNT_TRUSTED = true;

/**
 * capacity and enrolled are trusted *independently* -- a course whose
 * capacity synced fine but whose applied_count didn't (very common: BE's
 * EdcRegi105 match rate is well under 100%, and that screen isn't even open
 * year-round) must still show its real capacity, not throw it away for a
 * fully-fake seeded one just because the *other* number is missing. Only
 * the specific number that's actually unavailable gets mocked -- this was
 * previously an all-or-nothing check, which is why real capacities were
 * showing up as obviously-wrong mock values whenever appliedCount was null.
 */
export function getCompetitionRate(course: {
  id: number;
  capacity: number | null;
  appliedCount: number | null;
}): CompetitionRate {
  const realCapacity = course.capacity != null && course.capacity > 0 ? course.capacity : null;
  const capacity = realCapacity ?? 20 + Math.floor(seededFraction(course.id) * 40); // 20..59

  const realEnrolled = APPLIED_COUNT_TRUSTED ? course.appliedCount : null;
  const enrolled = realEnrolled ?? Math.round(capacity * (0.2 + seededFraction(course.id + 1) * 1.3)); // ~20%..150% of capacity

  return {
    capacity,
    enrolled,
    rate: roundRate(enrolled / capacity),
    isMock: realCapacity == null || realEnrolled == null,
  };
}

/** Two decimal places, e.g. 0.782 -> 0.78 -- matches the "0.78" style display. */
function roundRate(rate: number): number {
  return Math.round(rate * 100) / 100;
}
