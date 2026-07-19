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
   * Upper bound — a combination totalling anywhere from 0 up to this value
   * is otherwise eligible. Omit (or leave undefined/null) for no cap.
   */
  maxCredit?: number | null;
  /**
   * Lower bound — a completed combination totalling less than this is
   * dropped. A partial pick is pruned early only once it's provable that no
   * amount of remaining picks can reach the floor (see maxRemainingCredit in
   * generateCombinations); it's still re-checked at completion since a
   * branch can validly cross the floor partway through. Omit (or leave
   * undefined/null) for no floor at all.
   */
  minCredit?: number | null;
}

export interface GenerateResult {
  /** Each entry is the list of courseIds picked — one per required group, absent for a skipped optional group. */
  combinations: string[][];
  /** True if a budget was hit before the search space was fully explored (results may be incomplete). */
  capped: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<GenerateOptions, "maxCredit" | "minCredit">> &
  Pick<GenerateOptions, "maxCredit" | "minCredit"> = {
  maxResults: 500,
  nodeBudget: 200_000,
  timeBudgetMs: 1500,
  maxCredit: null,
  minCredit: null,
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

  // maxRemainingCredit[i] = the most credit a branch could still add by
  // taking the single highest-credit candidate from every group at index
  // i..end (optional groups can also validly add 0, but for an upper-bound
  // prune we only care about the best case). Lets backtrack() give up on a
  // branch immediately once even that best case can't reach minCredit,
  // instead of exploring it all the way to a leaf just to discard it there.
  const maxRemainingCredit: number[] = new Array(orderedGroups.length + 1).fill(0);
  for (let i = orderedGroups.length - 1; i >= 0; i--) {
    const groupMax = orderedGroups[i].candidates.reduce((max, c) => Math.max(max, c.credit), 0);
    maxRemainingCredit[i] = maxRemainingCredit[i + 1] + groupMax;
  }

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
      if (opts.minCredit == null || usedCredit >= opts.minCredit) {
        combinations.push([...picked]);
      }
      return;
    }

    if (opts.minCredit != null && usedCredit + maxRemainingCredit[index] < opts.minCredit) {
      return; // even the best case from here can't reach the floor
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
