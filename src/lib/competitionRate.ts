/**
 * BE hasn't reverse-engineered nDRIMS's real enrollment-count endpoint yet
 * (see dongguk-timetable-be STATUS.md) — `capacity`/`enrolled` are always 0
 * in every row captured so far. Rather than block the whole "경쟁률" UI on
 * that, courses with no real data get a deterministic placeholder so the
 * feature is visible/reviewable now and swaps to real numbers automatically
 * once the BE crawler starts populating them (capacity > 0 is the signal).
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

export function getCompetitionRate(course: {
  id: number;
  capacity: number | null;
  enrolled: number | null;
}): CompetitionRate {
  if (course.capacity != null && course.capacity > 0) {
    const capacity = course.capacity;
    const enrolled = course.enrolled ?? 0;
    return { capacity, enrolled, ratePercent: Math.round((enrolled / capacity) * 100), isMock: false };
  }

  const capacity = 20 + Math.floor(seededFraction(course.id) * 40); // 20..59
  const enrolled = Math.round(capacity * (0.2 + seededFraction(course.id + 1) * 1.3)); // ~20%..150% of capacity
  return { capacity, enrolled, ratePercent: Math.round((enrolled / capacity) * 100), isMock: true };
}
