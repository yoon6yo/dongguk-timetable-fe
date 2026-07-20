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
