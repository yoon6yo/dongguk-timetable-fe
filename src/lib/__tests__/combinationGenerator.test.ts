import { describe, expect, it } from "vitest";

import { hasConflict, timeToMinutes, type TimeBlock } from "../conflict";
import { generateCombinations, rankCombinations, type Group } from "../combinationGenerator";
import type { Weights } from "../scoring";

function block(dayOfWeek: number, start: string, end: string): TimeBlock {
  return { dayOfWeek, startMinutes: timeToMinutes(start), endMinutes: timeToMinutes(end) };
}

const NEUTRAL_WEIGHTS: Weights = { gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50 };

describe("generateCombinations", () => {
  it("a required group contributes exactly one candidate to every combination", () => {
    const groups: Group[] = [
      {
        id: "major",
        required: true,
        candidates: [
          { courseId: "A", blocks: [block(1, "09:00", "10:30")] },
          { courseId: "B", blocks: [block(3, "09:00", "10:30")] },
        ],
      },
    ];

    const { combinations } = generateCombinations(groups);

    expect(combinations).toHaveLength(2);
    for (const combo of combinations) {
      expect(combo).toHaveLength(1);
    }
    expect(combinations.flat().sort()).toEqual(["A", "B"]);
  });

  it("an optional group may contribute 0 or 1 candidates", () => {
    const groups: Group[] = [
      {
        id: "elective",
        required: false,
        candidates: [{ courseId: "A", blocks: [block(1, "09:00", "10:30")] }],
      },
    ];

    const { combinations } = generateCombinations(groups);

    expect(combinations).toHaveLength(2);
    expect(combinations).toContainEqual([]);
    expect(combinations).toContainEqual(["A"]);
  });

  it("never returns a combination where two picked courses conflict", () => {
    const groups: Group[] = [
      {
        id: "g1",
        required: true,
        candidates: [{ courseId: "A", blocks: [block(2, "09:00", "10:30")] }],
      },
      {
        id: "g2",
        required: true,
        candidates: [
          { courseId: "B", blocks: [block(2, "10:00", "11:30")] }, // conflicts with A
          { courseId: "C", blocks: [block(4, "09:00", "10:30")] }, // does not
        ],
      },
    ];

    const { combinations } = generateCombinations(groups);

    expect(combinations).toEqual([["A", "C"]]);
  });

  it("a required group with zero candidates makes the whole search space empty", () => {
    const groups: Group[] = [
      { id: "impossible", required: true, candidates: [] },
      { id: "other", required: true, candidates: [{ courseId: "X", blocks: [] }] },
    ];

    const { combinations } = generateCombinations(groups);

    expect(combinations).toEqual([]);
  });

  it("zero groups produces exactly one (empty) combination", () => {
    const { combinations, capped } = generateCombinations([]);
    expect(combinations).toEqual([[]]);
    expect(capped).toBe(false);
  });

  it("independent groups combine as a full cross product when nothing conflicts", () => {
    const groups: Group[] = [
      {
        id: "g1",
        required: true,
        candidates: [
          { courseId: "A1", blocks: [block(1, "09:00", "10:30")] },
          { courseId: "A2", blocks: [block(1, "11:00", "12:30")] },
        ],
      },
      {
        id: "g2",
        required: true,
        candidates: [
          { courseId: "B1", blocks: [block(3, "09:00", "10:30")] },
          { courseId: "B2", blocks: [block(3, "11:00", "12:30")] },
        ],
      },
    ];

    const { combinations } = generateCombinations(groups);

    expect(combinations).toHaveLength(4);
  });

  it("respects maxResults and reports capped=true", () => {
    const groups: Group[] = [
      {
        id: "g1",
        required: true,
        candidates: Array.from({ length: 10 }, (_, i) => ({
          courseId: `C${i}`,
          blocks: [block(1, "09:00", "10:00")], // all mutually conflicting if combined, but this is the only group
        })),
      },
    ];

    const { combinations, capped } = generateCombinations(groups, { maxResults: 3 });

    expect(combinations).toHaveLength(3);
    expect(capped).toBe(true);
  });

  it("respects a tiny node budget and reports capped=true", () => {
    const manyGroups: Group[] = Array.from({ length: 6 }, (_, g) => ({
      id: `g${g}`,
      required: true,
      candidates: Array.from({ length: 5 }, (_, i) => ({
        courseId: `g${g}-c${i}`,
        blocks: [block((g % 5) + 1, "09:00", "10:00")], // deliberately non-conflicting across groups (different days)
      })),
    }));

    const { capped } = generateCombinations(manyGroups, { nodeBudget: 10, maxResults: 100_000 });

    expect(capped).toBe(true);
  });

  it("every returned combination is internally conflict-free (cross-check against hasConflict)", () => {
    const groups: Group[] = [
      {
        id: "g1",
        required: true,
        candidates: [
          { courseId: "A", blocks: [block(1, "09:00", "10:30")] },
          { courseId: "B", blocks: [block(1, "10:00", "11:30")] },
        ],
      },
      {
        id: "g2",
        required: false,
        candidates: [
          { courseId: "C", blocks: [block(1, "09:30", "11:00")] },
          { courseId: "D", blocks: [block(3, "09:00", "10:30")] },
        ],
      },
    ];
    const blocksById = new Map(groups.flatMap((g) => g.candidates.map((c) => [c.courseId, c.blocks] as const)));

    const { combinations } = generateCombinations(groups);

    for (const combo of combinations) {
      for (let i = 0; i < combo.length; i++) {
        for (let j = i + 1; j < combo.length; j++) {
          expect(hasConflict(blocksById.get(combo[i])!, blocksById.get(combo[j])!)).toBe(false);
        }
      }
    }
  });
});

describe("rankCombinations", () => {
  it("sorts combinations descending by total score", () => {
    const blocksByCourseId = new Map<string, TimeBlock[]>([
      ["gap-free", [block(1, "09:00", "10:30"), block(1, "10:30", "12:00")]], // no idle gap
      ["gap-heavy", [block(1, "09:00", "10:00"), block(1, "20:00", "21:00")]], // huge idle gap
    ]);
    const combinations = [["gap-heavy"], ["gap-free"]];
    const weights: Weights = { gap: 100, lunch: 0, freeDay: 0, timeOfDay: 50 };

    const ranked = rankCombinations(combinations, blocksByCourseId, weights);

    expect(ranked[0].courseIds).toEqual(["gap-free"]);
    expect(ranked[1].courseIds).toEqual(["gap-heavy"]);
    expect(ranked[0].score.total).toBeGreaterThan(ranked[1].score.total);
  });

  it("handles courseIds with no schedule blocks gracefully (empty array)", () => {
    const ranked = rankCombinations([["missing"]], new Map(), NEUTRAL_WEIGHTS);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].score.total).toBe(100); // no blocks at all -> every sub-score maxes out
  });
});
