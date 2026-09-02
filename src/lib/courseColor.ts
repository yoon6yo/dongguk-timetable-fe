const SLOT_COUNT = 8;

/**
 * Per-slot text color for legibility on that slot's fill (computed via WCAG
 * contrast against both the light and dark hex for each slot -- see
 * globals.css for the actual hex values). Black wins every slot except
 * green, where white clears black by a wider margin in both modes.
 */
const WHITE_TEXT_SLOTS = new Set([1]); // slot index 1 = green (0-indexed)

/**
 * Deterministic color-slot assignment from a course id, so the same course
 * always renders in the same color everywhere it appears across combinations
 * ("color follows the entity, never its rank" -- see dataviz skill). Plain
 * modulo, not a hash: course ids are opaque DB auto-increment integers, not
 * sequential in a way that would visibly cluster adjacent slots within one
 * combination's small course set.
 */
export function courseColorIndex(courseId: number): number {
  return ((courseId % SLOT_COUNT) + SLOT_COUNT) % SLOT_COUNT;
}

/** CSS var reference for a course's background fill -- swaps light/dark
 * automatically via the prefers-color-scheme media query in globals.css. */
export function courseBackgroundColor(courseId: number): string {
  return `var(--series-${courseColorIndex(courseId) + 1})`;
}

/** Text color that reads on that course's fill, in either mode. */
export function courseTextColor(courseId: number): string {
  return WHITE_TEXT_SLOTS.has(courseColorIndex(courseId)) ? "#ffffff" : "#000000";
}

/**
 * Per-render collision avoidance for the set of courses actually shown
 * together in one grid. Plain courseColorIndex (id % 8) is blind to
 * sibling courses, so two unrelated ids landing on the same slot by chance
 * is common well before a combo has 8 courses -- with 5 courses already
 * ~80% likely to have at least one collision (birthday-paradox math over 8
 * slots), which reads as "two different courses painted the same color".
 *
 * Each course still prefers its own natural slot (id % 8) first, so the
 * same course tends to land in the same color across different
 * combinations that don't force a clash -- ids are processed in ascending
 * order so, when two courses in the SAME set want the same slot, the lower
 * id keeps it and the other linearly probes forward to the next free slot.
 * Only once a set has more than SLOT_COUNT distinct courses does reuse
 * become unavoidable (pigeonhole); probing then falls back to each
 * course's own natural slot.
 */
export function assignCourseColors(courseIds: number[]): Map<number, number> {
  const uniqueIds = Array.from(new Set(courseIds)).sort((a, b) => a - b);
  const taken = new Array<boolean>(SLOT_COUNT).fill(false);
  const assignment = new Map<number, number>();

  for (const id of uniqueIds) {
    let slot = courseColorIndex(id);
    for (let attempt = 0; attempt < SLOT_COUNT && taken[slot]; attempt++) {
      slot = (slot + 1) % SLOT_COUNT;
    }
    taken[slot] = true;
    assignment.set(id, slot);
  }

  return assignment;
}

/** CSS var reference for a resolved slot index (see assignCourseColors). */
export function slotBackgroundColor(slot: number): string {
  return `var(--series-${slot + 1})`;
}

/** Text color that reads on a resolved slot's fill, in either mode. */
export function slotTextColor(slot: number): string {
  return WHITE_TEXT_SLOTS.has(slot) ? "#ffffff" : "#000000";
}
