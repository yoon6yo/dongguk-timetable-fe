import { generateCombinations, rankCombinations, type Group, type ScoredCombination } from "@/lib/combinationGenerator";
import type { TimeBlock } from "@/lib/conflict";
import type { Weights } from "@/lib/scoring";

/**
 * Runs off the main thread so a large group/candidate count never freezes
 * the UI. Deliberately thin — generateCombinations/rankCombinations carry all
 * the actual logic and are unit-tested directly; this file is just message
 * plumbing (untestable in jsdom, which has no real Worker implementation).
 */
export interface CombinationWorkerRequest {
  groups: Group[];
  /** Map isn't always structured-clone-friendly across older engines, so entries travel as a plain array. */
  blockEntries: [string, TimeBlock[]][];
  weights: Weights;
  maxResults?: number;
}

export interface CombinationWorkerResponse {
  combinations: ScoredCombination[];
  capped: boolean;
}

addEventListener("message", (event: MessageEvent<CombinationWorkerRequest>) => {
  const { groups, blockEntries, weights, maxResults } = event.data;

  const { combinations, capped } = generateCombinations(groups, { maxResults });
  const ranked = rankCombinations(combinations, new Map(blockEntries), weights);

  const response: CombinationWorkerResponse = { combinations: ranked, capped };
  // `self` resolves to Window's postMessage overload (requiring targetOrigin) under
  // the default "dom" tsconfig lib; casting to the Worker-side signature (message only)
  // matches what's actually available in a real worker's global scope at runtime.
  (self as unknown as Worker).postMessage(response);
});
