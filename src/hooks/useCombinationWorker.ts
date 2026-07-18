"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CombinationWorkerRequest, CombinationWorkerResponse } from "@/workers/combinationWorker";

interface UseCombinationWorkerResult {
  running: boolean;
  result: CombinationWorkerResponse | null;
  error: string | null;
  run: (request: CombinationWorkerRequest) => void;
}

/**
 * Not unit-tested: jsdom (our vitest environment) has no real Worker
 * implementation, so this thin wiring layer can only be verified in an
 * actual browser. The logic it delegates to (generateCombinations,
 * rankCombinations) is fully covered under src/lib/__tests__.
 */
export function useCombinationWorker(): UseCombinationWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CombinationWorkerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const run = useCallback((request: CombinationWorkerRequest) => {
    if (typeof Worker === "undefined") {
      setError("이 브라우저는 Web Worker를 지원하지 않습니다");
      return;
    }

    workerRef.current?.terminate();
    const worker = new Worker(new URL("../workers/combinationWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    setRunning(true);
    setError(null);
    setResult(null);

    worker.onmessage = (event: MessageEvent<CombinationWorkerResponse>) => {
      setResult(event.data);
      setRunning(false);
    };
    worker.onerror = () => {
      setError("조합을 생성하는 중 오류가 발생했습니다");
      setRunning(false);
    };

    worker.postMessage(request);
  }, []);

  return { running, result, error, run };
}
