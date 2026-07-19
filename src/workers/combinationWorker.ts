import { generateCombinations, rankCombinations, type Group, type ScoredCombination } from "@/lib/combinationGenerator";
import type { Weights } from "@/lib/scoring";

/**
 * Runs off the main thread so a large group/candidate count never freezes
 * the UI. Deliberately thin — generateCombinations/rankCombinations carry all
 * the actual logic and are unit-tested directly; this file is just message
 * plumbing (untestable in jsdom, which has no real Worker implementation).
 */
export interface CombinationWorkerRequest {
  groups: Group[];
  weights: Weights;
  maxResults?: number;
  /** Upper bound on total credit — see combinationGenerator's GenerateOptions.maxCredit. */
  maxCredit?: number | null;
  /** Lower bound on total credit — see combinationGenerator's GenerateOptions.minCredit. */
  minCredit?: number | null;
}

export interface CombinationWorkerResponse {
  combinations: ScoredCombination[];
  capped: boolean;
}

addEventListener("message", (event: MessageEvent<CombinationWorkerRequest>) => {
  const { groups, weights, maxResults, maxCredit, minCredit } = event.data;

  // Every candidate already carries its own blocks/credit (see Group/CourseCandidate),
  // so both lookup maps rankCombinations needs are derived here rather than
  // shipped separately over postMessage.
  const blocksByCourseId = new Map(groups.flatMap((g) => g.candidates.map((c) => [c.courseId, c.blocks] as const)));
  const creditByCourseId = new Map(groups.flatMap((g) => g.candidates.map((c) => [c.courseId, c.credit] as const)));

  const { combinations, capped } = generateCombinations(groups, { maxResults, maxCredit, minCredit });
  const ranked = rankCombinations(combinations, blocksByCourseId, weights, creditByCourseId);

  const response: CombinationWorkerResponse = { combinations: ranked, capped };
  // `self` resolves to Window's postMessage overload (requiring targetOrigin) under
  // the default "dom" tsconfig lib; casting to the Worker-side signature (message only)
  // matches what's actually available in a real worker's global scope at runtime.
  (self as unknown as Worker).postMessage(response);
});
