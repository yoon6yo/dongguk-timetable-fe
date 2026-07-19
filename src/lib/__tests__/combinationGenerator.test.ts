import { describe, expect, it } from "vitest";

import { hasConflict, timeToMinutes, type TimeBlock } from "../conflict";
import { generateCombinations, rankCombinations, type CourseCandidate, type Group } from "../combinationGenerator";
import type { Weights } from "../scoring";

function block(dayOfWeek: number, start: string, end: string): TimeBlock {
  return { dayOfWeek, startMinutes: timeToMinutes(start), endMinutes: timeToMinutes(end) };
}

function candidate(courseId: string, blocks: TimeBlock[], credit = 3): CourseCandidate {
  return { courseId, blocks, credit };
}

const NEUTRAL_WEIGHTS: Weights = { gap: 50, lunch: 50, freeDay: 50, timeOfDay: 50, commute: 50 };

describe("generateCombinations", () => {
  it("a required group contributes exactly one candidate to every combination", () => {
    const groups: Group[] = [
      {
        id: "major",
        required: true,
        candidates: [candidate("A", [block(1, "09:00", "10:30")]), candidate("B", [block(3, "09:00", "10:30")])],
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
        candidates: [candidate("A", [block(1, "09:00", "10:30")])],
      },
    ];

    const { combinations } = generateCombinations(groups);

    expect(combinations).toHaveLength(2);
    expect(combinations).toContainEqual([]);
    expect(combinations).toContainEqual(["A"]);
  });

  it("never returns a combination where two picked courses conflict", () => {
    const groups: Group[] = [
      { id: "g1", required: true, candidates: [candidate("A", [block(2, "09:00", "10:30")])] },
      {
        id: "g2",
        required: true,
        candidates: [
          candidate("B", [block(2, "10:00", "11:30")]), // conflicts with A
          candidate("C", [block(4, "09:00", "10:30")]), // does not
        ],
      },
    ];

    const { combinations } = generateCombinations(groups);

    expect(combinations).toEqual([["A", "C"]]);
  });

  it("a required group with zero candidates makes the whole search space empty", () => {
    const groups: Group[] = [
      { id: "impossible", required: true, candidates: [] },
      { id: "other", required: true, candidates: [candidate("X", [])] },
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
        candidates: [candidate("A1", [block(1, "09:00", "10:30")]), candidate("A2", [block(1, "11:00", "12:30")])],
      },
      {
        id: "g2",
        required: true,
        candidates: [candidate("B1", [block(3, "09:00", "10:30")]), candidate("B2", [block(3, "11:00", "12:30")])],
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
        candidates: Array.from({ length: 10 }, (_, i) => candidate(`C${i}`, [block(1, "09:00", "10:00")])),
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
      candidates: Array.from({ length: 5 }, (_, i) => candidate(`g${g}-c${i}`, [block((g % 5) + 1, "09:00", "10:00")])),
    }));

    const { capped } = generateCombinations(manyGroups, { nodeBudget: 10, maxResults: 100_000 });

    expect(capped).toBe(true);
  });

  it("every returned combination is internally conflict-free (cross-check against hasConflict)", () => {
    const groups: Group[] = [
      {
        id: "g1",
        required: true,
        candidates: [candidate("A", [block(1, "09:00", "10:30")]), candidate("B", [block(1, "10:00", "11:30")])],
      },
      {
        id: "g2",
        required: false,
        candidates: [candidate("C", [block(1, "09:30", "11:00")]), candidate("D", [block(3, "09:00", "10:30")])],
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

  describe("maxCredit", () => {
    it("excludes a combination whose total credit exceeds the cap", () => {
      const groups: Group[] = [
        { id: "g1", required: true, candidates: [candidate("A", [block(1, "09:00", "10:30")], 3)] },
        { id: "g2", required: true, candidates: [candidate("B", [block(3, "09:00", "10:30")], 4)] },
      ];

      const { combinations } = generateCombinations(groups, { maxCredit: 6 });

      expect(combinations).toEqual([]); // 3 + 4 = 7 > 6
    });

    it("includes a combination exactly at the cap", () => {
      const groups: Group[] = [
        { id: "g1", required: true, candidates: [candidate("A", [block(1, "09:00", "10:30")], 3)] },
        { id: "g2", required: true, candidates: [candidate("B", [block(3, "09:00", "10:30")], 4)] },
      ];

      const { combinations } = generateCombinations(groups, { maxCredit: 7 });

      expect(combinations).toEqual([["A", "B"]]);
    });

    it("still includes combinations well under the cap — no lower bound", () => {
      const groups: Group[] = [
        { id: "g1", required: false, candidates: [candidate("A", [block(1, "09:00", "10:30")], 3)] },
      ];

      const { combinations } = generateCombinations(groups, { maxCredit: 21 });

      expect(combinations).toContainEqual([]); // 0 credits, well under 21 — still valid
      expect(combinations).toContainEqual(["A"]); // 3 credits, also under 21
    });

    it("with no maxCredit set, credit totals never constrain the search (backward compatible)", () => {
      const groups: Group[] = [
        { id: "g1", required: true, candidates: [candidate("A", [], 99)] },
        { id: "g2", required: true, candidates: [candidate("B", [], 99)] },
      ];

      const { combinations } = generateCombinations(groups);

      expect(combinations).toEqual([["A", "B"]]);
    });

    it("prunes a partial branch as soon as it exceeds the cap, without needing to reach a full combination", () => {
      const groups: Group[] = [
        { id: "g1", required: true, candidates: [candidate("A", [], 10)] },
        { id: "g2", required: true, candidates: [candidate("B", [], 10)] },
        { id: "g3", required: true, candidates: [candidate("C", [], 10)] },
      ];

      const { combinations } = generateCombinations(groups, { maxCredit: 15 });

      expect(combinations).toEqual([]); // any single candidate alone is fine, but no full combo fits
    });
  });

  describe("minCredit", () => {
    it("excludes a completed combination whose total credit is below the floor", () => {
      const groups: Group[] = [
        { id: "g1", required: false, candidates: [candidate("A", [block(1, "09:00", "10:30")], 3)] },
      ];

      const { combinations } = generateCombinations(groups, { minCredit: 12 });

      expect(combinations).toEqual([]); // 0 credits (skip) and 3 credits (A) are both under 12
    });

    it("includes a combination exactly at the floor", () => {
      const groups: Group[] = [
        { id: "g1", required: true, candidates: [candidate("A", [block(1, "09:00", "10:30")], 12)] },
      ];

      const { combinations } = generateCombinations(groups, { minCredit: 12 });

      expect(combinations).toEqual([["A"]]);
    });

    it("combines with maxCredit to enforce a 12-21 range", () => {
      const groups: Group[] = [
        { id: "g1", required: true, candidates: [candidate("low", [], 6)] },
        { id: "g2", required: false, candidates: [candidate("extra", [], 6)] },
      ];

      const { combinations } = generateCombinations(groups, { minCredit: 12, maxCredit: 21 });

      // "low" alone is 6 credits (under 12, excluded); "low"+"extra" is 12 (kept)
      expect(combinations).toEqual([["low", "extra"]]);
    });

    it("with no minCredit set, low-credit combinations are unaffected (backward compatible)", () => {
      const groups: Group[] = [
        { id: "g1", required: false, candidates: [candidate("A", [block(1, "09:00", "10:30")], 3)] },
      ];

      const { combinations } = generateCombinations(groups);

      expect(combinations).toContainEqual([]);
      expect(combinations).toContainEqual(["A"]);
    });
  });
});

describe("rankCombinations", () => {
  it("sorts combinations descending by total score", () => {
    const blocksByCourseId = new Map<string, TimeBlock[]>([
      ["gap-free", [block(1, "09:00", "10:30"), block(1, "10:30", "12:00")]], // no idle gap
      ["gap-heavy", [block(1, "09:00", "10:00"), block(1, "20:00", "21:00")]], // huge idle gap
    ]);
    const creditByCourseId = new Map([
      ["gap-free", 3],
      ["gap-heavy", 3],
    ]);
    const combinations = [["gap-heavy"], ["gap-free"]];
    const weights: Weights = { gap: 100, lunch: 0, freeDay: 0, timeOfDay: 50, commute: 0 };

    const ranked = rankCombinations(combinations, blocksByCourseId, weights, creditByCourseId);

    expect(ranked[0].courseIds).toEqual(["gap-free"]);
    expect(ranked[1].courseIds).toEqual(["gap-heavy"]);
    expect(ranked[0].score.total).toBeGreaterThan(ranked[1].score.total);
  });

  it("handles courseIds with no schedule blocks gracefully (empty array)", () => {
    const ranked = rankCombinations([["missing"]], new Map(), NEUTRAL_WEIGHTS, new Map());
    expect(ranked).toHaveLength(1);
    expect(ranked[0].score.total).toBe(100); // no blocks at all -> every sub-score maxes out
  });

  it("sums each combination's total credit from the given map", () => {
    const creditByCourseId = new Map([
      ["A", 3],
      ["B", 4],
    ]);

    const ranked = rankCombinations([["A", "B"]], new Map(), NEUTRAL_WEIGHTS, creditByCourseId);

    expect(ranked[0].totalCredit).toBe(7);
  });

  it("treats a courseId missing from the credit map as 0 credit rather than throwing", () => {
    const ranked = rankCombinations([["unknown"]], new Map(), NEUTRAL_WEIGHTS, new Map());
    expect(ranked[0].totalCredit).toBe(0);
  });
});
