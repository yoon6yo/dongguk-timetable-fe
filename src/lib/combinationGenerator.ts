import { hasConflict, type TimeBlock } from "./conflict";
import { scoreCombination, type ScoreBreakdown, type Weights } from "./scoring";

export interface CourseCandidate {
  courseId: string;
  blocks: TimeBlock[];
  credit: number;
}

export interface Group {
  id: string;
  required: boolean;
  candidates: CourseCandidate[];
}

export interface GenerateOptions {
  /** Stop once this many valid combinations have been found. */
  maxResults?: number;
  /** Stop exploring after this many backtracking nodes, whichever budget hits first. */
  nodeBudget?: number;
  /** Stop exploring after this much wall-clock time, whichever budget hits first. */
  timeBudgetMs?: number;
  /**
   * Upper bound only — a combination totalling anywhere from 0 up to this
   * value is valid and returned. There is no lower bound: a combo well under
   * this cap is just as eligible as one that fills it exactly. Omit (or
   * leave undefined/null) for no credit constraint at all.
   */
  maxCredit?: number | null;
}

export interface GenerateResult {
  /** Each entry is the list of courseIds picked — one per required group, absent for a skipped optional group. */
  combinations: string[][];
  /** True if a budget was hit before the search space was fully explored (results may be incomplete). */
  capped: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<GenerateOptions, "maxCredit">> & Pick<GenerateOptions, "maxCredit"> = {
  maxResults: 500,
  nodeBudget: 200_000,
  timeBudgetMs: 1500,
  maxCredit: null,
};

/**
 * Backtracking search with early conflict pruning — deliberately not a
 * cartesian product + filter, since e.g. 6 groups x ~10 candidates each is up
 * to 10^6 combinations naive, most of which conflict early. Groups are
 * explored smallest-candidate-count first so dead ends are hit sooner. Every
 * partial pick is conflict-checked (and, if set, credit-checked) before
 * recursing, so no wasted work is ever done on a branch that's already invalid.
 */
export function generateCombinations(groups: Group[], options: GenerateOptions = {}): GenerateResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const orderedGroups = [...groups].sort((a, b) => a.candidates.length - b.candidates.length);

  const combinations: string[][] = [];
  let nodesVisited = 0;
  let capped = false;
  const deadline = Date.now() + opts.timeBudgetMs;

  // Any of these being true means the result set may be incomplete —
  // reaching maxResults is just as much a "capped" result as running out of
  // node/time budget, since more valid combinations could still exist beyond it.
  function shouldStop(): boolean {
    if (combinations.length >= opts.maxResults) {
      capped = true;
      return true;
    }
    if (nodesVisited > opts.nodeBudget || Date.now() > deadline) {
      capped = true;
      return true;
    }
    return false;
  }

  function backtrack(index: number, picked: string[], usedBlocks: TimeBlock[], usedCredit: number): void {
    if (shouldStop()) return;
    nodesVisited++;

    if (index === orderedGroups.length) {
      combinations.push([...picked]);
      return;
    }

    const group = orderedGroups[index];

    if (!group.required) {
      backtrack(index + 1, picked, usedBlocks, usedCredit);
      if (shouldStop()) return;
    }

    for (const candidate of group.candidates) {
      if (hasConflict(candidate.blocks, usedBlocks)) continue;
      if (opts.maxCredit != null && usedCredit + candidate.credit > opts.maxCredit) continue;

      picked.push(candidate.courseId);
      backtrack(index + 1, picked, usedBlocks.concat(candidate.blocks), usedCredit + candidate.credit);
      picked.pop();
      if (shouldStop()) return;
    }
  }

  backtrack(0, [], [], 0);
  return { combinations, capped };
}

export interface ScoredCombination {
  courseIds: string[];
  score: ScoreBreakdown;
  totalCredit: number;
}

/** Scores and ranks (descending by total) a set of combinations already produced by generateCombinations. */
export function rankCombinations(
  combinations: string[][],
  blocksByCourseId: Map<string, TimeBlock[]>,
  weights: Weights,
  creditByCourseId: Map<string, number>
): ScoredCombination[] {
  return combinations
    .map((courseIds) => {
      const blocks = courseIds.flatMap((id) => blocksByCourseId.get(id) ?? []);
      const totalCredit = courseIds.reduce((sum, id) => sum + (creditByCourseId.get(id) ?? 0), 0);
      return { courseIds, score: scoreCombination(blocks, weights), totalCredit };
    })
    .sort((a, b) => b.score.total - a.score.total);
}
