"use client";

// Root error boundary. The realistic trigger isn't an attack -- it's this
// app's own next schema change to a zustand-persisted store (groups/saved
// timetables/weights/custom events) meeting a browser that still has the old
// shape in localStorage. zustand's persist middleware already survives
// malformed JSON, but a type-wrong *valid* JSON (e.g. a stale schema) can
// still throw during render, and without this boundary that's a blank page
// with no way back short of opening devtools.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  function resetLocalDataAndRetry() {
    try {
      localStorage.clear();
    } catch {
      // localStorage can throw in private-browsing/quota-exceeded edge cases —
      // reset() below still gives the user a way forward either way.
    }
    reset();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-bold">문제가 발생했어요</h1>
      <p className="text-sm text-text-secondary">
        저장된 데이터가 최신 형식과 맞지 않을 수 있어요. 다시 시도하거나, 저장된 그룹·시간표 데이터를
        초기화한 뒤 다시 시도해보세요.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full border border-neutral px-4 py-2 text-sm font-medium transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={resetLocalDataAndRetry}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95"
        >
          데이터 초기화하고 다시 시도
        </button>
      </div>
    </div>
  );
}
