"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildGenerationInput, type GenerationInput } from "@/lib/buildGenerationInput";
import { rankCombinations, type ScoredCombination } from "@/lib/combinationGenerator";
import { computeCreditRangeWarning, formatCreditRangeWarning, type CreditRangeWarning } from "@/lib/creditRangeWarning";
import { customEventToCourseRow } from "@/lib/customEvents";
import { exportTimetableAsCsv } from "@/lib/exportCsv";
import { exportElementAsPng } from "@/lib/exportImage";
import { exportTimetableAsTxt } from "@/lib/exportTxt";
import type { CourseRow } from "@/lib/types";
import { formatWeightsSummary, matchWeightPreset, WEIGHT_PRESETS } from "@/lib/weightPresets";
import { useCombinationWorker } from "@/hooks/useCombinationWorker";
import { useCoursesStore } from "@/store/coursesStore";
import { MAX_SCHOOL_CREDIT, MIN_SCHOOL_CREDIT, useCreditLimitStore } from "@/store/creditLimitStore";
import { useCustomEventsStore } from "@/store/customEventsStore";
import { useGroupsStore } from "@/store/groupsStore";
import { useSavedTimetablesStore } from "@/store/savedTimetablesStore";
import { useWeightsStore } from "@/store/weightsStore";
import { useWizardStore } from "@/store/wizardStore";

import { Modal } from "../Modal";
import { TimetableExportCard } from "../TimetableExportCard";
import { TimetableGrid } from "../TimetableGrid";
import { TimetableTable } from "../TimetableTable";
import { StepWeights } from "./StepWeights";

/** Stable identity for a combo, independent of its position in the ranked
 * list -- lets the selected card survive a re-sort (preset/advanced weight
 * change) instead of silently pointing at a different combo by index. */
function comboKey(combo: ScoredCombination): string {
  return combo.courseIds.join(",");
}

/** One result card. Memoized so selecting a card (or any other unrelated
 * StepResults state change) only re-renders the ≤2 cards whose `isSelected`
 * actually flipped, not all ≤200 — `comboCourses` is derived here (not in
 * the parent's .map()) so it's a stable reference across renders where
 * `combo`/`courseById` are unchanged, letting TimetableGrid's own memo bail
 * out too. */
const ComboCard = memo(function ComboCard({
  combo,
  idx,
  courseById,
  isSelected,
  onSelect,
}: {
  combo: ScoredCombination;
  idx: number;
  courseById: Map<string, CourseRow>;
  isSelected: boolean;
  onSelect: (key: string) => void;
}) {
  const comboCourses = useMemo(
    () => combo.courseIds.map((id) => courseById.get(id)).filter((c): c is CourseRow => Boolean(c)),
    [combo, courseById]
  );
  const key = comboKey(combo);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(key)}
        className={`w-full rounded-lg border p-3 text-left text-sm shadow-card transition-all duration-150 hover:shadow-card-hover active:scale-[0.99] ${
          isSelected ? "border-primary/30 bg-primary-tint ring-2 ring-primary" : "border-neutral/15 bg-surface"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold">#{idx + 1}</span>
          <span className="text-text-secondary">
            {combo.totalCredit}학점 · 점수 {combo.score.total.toFixed(1)}
          </span>
        </div>
        <div className="mt-2">
          <TimetableGrid courses={comboCourses} compact />
        </div>
      </button>
    </li>
  );
});

export function StepResults() {
  const groups = useGroupsStore((s) => s.groups);
  const removeGroup = useGroupsStore((s) => s.removeGroup);
  const courses = useCoursesStore((s) => s.courses);
  const semester = useCoursesStore((s) => s.semester);
  const customEvents = useCustomEventsStore((s) => s.events);
  const weights = useWeightsStore((s) => s.weights);
  const setWeights = useWeightsStore((s) => s.setWeights);
  const maxCredit = useCreditLimitStore((s) => s.maxCredit);
  const saveTimetable = useSavedTimetablesStore((s) => s.saveTimetable);
  const { running, result, error, run } = useCombinationWorker();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [blackoutExport, setBlackoutExport] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [creditWarning, setCreditWarning] = useState<CreditRangeWarning | null>(null);
  // 검색으로 생성된 조합 집합 자체(어떤 조합이 시간 충돌 없이 유효한지)는 가중치와
  // 무관 -- 순위만 바뀐다. 그래서 정렬 기준(프리셋/고급 설정)을 바꿀 때마다 워커를
  // 다시 돌리지 않고, 생성 시점에 저장해둔 이 맵으로 메인 스레드에서 즉시 재정렬한다.
  const [genMaps, setGenMaps] = useState<Pick<GenerationInput, "blocksByCourseId" | "creditByCourseId"> | null>(null);
  const prettyExportRef = useRef<HTMLDivElement>(null);
  const selectedDetailRef = useRef<HTMLDivElement>(null);

  const customEventCourses = useMemo(() => customEvents.map(customEventToCourseRow), [customEvents]);
  // 개인 일정은 groupsStore에 담기는 실제 과목이 아니지만, 그리드/표/저장 등 모든 화면에서
  // 과목과 동등하게 취급되도록 courseById 조회 대상에 함께 포함한다.
  const courseById = useMemo(
    () => new Map([...courses, ...customEventCourses].map((c) => [String(c.id), c])),
    [courses, customEventCourses]
  );

  const markGenerateAttempted = useWizardStore((s) => s.markGenerateAttempted);

  const displayedCombinations = useMemo<ScoredCombination[]>(() => {
    if (!result || !genMaps) return [];
    const rawCourseIdLists = result.combinations.map((c) => c.courseIds);
    return rankCombinations(rawCourseIdLists, genMaps.blocksByCourseId, weights, genMaps.creditByCourseId);
  }, [result, genMaps, weights]);

  const activePresetKey = matchWeightPreset(weights);

  const handleSelectCombo = useCallback((key: string) => setSelectedKey(key), []);

  // 후보가 최대 200개까지 나올 수 있어서, 선택한 조합의 상세가 그 아래에만
  // 뜨면 목록 끝까지 직접 스크롤해야 확인할 수 있다 -- 카드를 고르는 순간
  // 상세로 자동 스크롤해서, 몇 번째 카드를 골랐든 같은 경험이 되게 한다.
  useEffect(() => {
    if (selectedKey) selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedKey]);

  function handleGenerate() {
    markGenerateAttempted();
    // 빈 그룹은 조합 생성에 아무 기여도 못 하고 혼란만 주므로, 생성 시점에 자동으로 정리한다.
    const emptyGroupIds = groups.filter((g) => g.courseIds.length === 0).map((g) => g.id);
    emptyGroupIds.forEach(removeGroup);
    const remainingGroups = groups.filter((g) => g.courseIds.length > 0);

    // 학점 범위상 애초에 불가능한 조합인지는 그룹 탭에 상시 배너로 띄우지 않고,
    // "시간표 생성"을 눌러 실제로 시도하는 시점에만 모달로 알려준다.
    const courseByIdNum = new Map(courses.map((c) => [c.id, c]));
    const warning = computeCreditRangeWarning(remainingGroups, courseByIdNum, MIN_SCHOOL_CREDIT, maxCredit ?? MAX_SCHOOL_CREDIT);
    setCreditWarning(warning);

    const { groups: generatorGroups, blocksByCourseId, creditByCourseId } = buildGenerationInput(
      remainingGroups,
      courses,
      customEventCourses
    );
    setGenMaps({ blocksByCourseId, creditByCourseId });
    run({
      groups: generatorGroups,
      weights,
      maxCredit,
      minCredit: MIN_SCHOOL_CREDIT,
      maxResults: 200,
    });
    setSelectedKey(null);
  }

  async function handleExportPng() {
    if (!prettyExportRef.current) return;
    await exportElementAsPng(prettyExportRef.current, "timetable.png");
  }

  function handleExportCsv() {
    if (selectedCourses.length === 0) return;
    exportTimetableAsCsv(selectedCourses, "timetable.csv");
  }

  function handleExportTxt() {
    if (selectedCourses.length === 0) return;
    exportTimetableAsTxt(selectedCourses, "timetable.txt");
  }

  function handleSaveTimetable() {
    if (!selected || !semester) return;
    saveTimetable({
      semester,
      courses: selectedCourses,
      totalCredit: selected.totalCredit,
      score: selected.score,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  }

  const selected = selectedKey != null ? displayedCombinations.find((c) => comboKey(c) === selectedKey) : undefined;
  const selectedCourses: CourseRow[] = selected
    ? selected.courseIds.map((id) => courseById.get(id)).filter((c): c is CourseRow => Boolean(c))
    : [];

  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <p className="text-sm text-text-secondary">그룹과 과목을 먼저 담아야 조합을 생성할 수 있습니다.</p>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={running || groups.length === 0}
        className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
      >
        {running ? "생성 중..." : "시간표 조합 생성하기"}
      </button>

      {creditWarning && (
        <Modal title="학점 범위 안내" onClose={() => setCreditWarning(null)}>
          <p className="text-sm text-error">⚠ {formatCreditRangeWarning(creditWarning)}</p>
        </Modal>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      {result && (
        <>
          <div className="space-y-1.5 rounded-lg border border-neutral/15 bg-surface p-3 shadow-card">
            <p className="text-sm font-medium">정렬 기준</p>
            <div className="flex flex-wrap gap-1.5">
              {WEIGHT_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setWeights(preset.weights)}
                  title={formatWeightsSummary(preset.weights)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                    activePresetKey === preset.key
                      ? "bg-primary text-white"
                      : "bg-neutral/20 text-text-secondary hover:bg-neutral/30"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAdvancedOpen(true)}
                title={activePresetKey === null ? formatWeightsSummary(weights) : "세부 기준을 직접 조정해요"}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  activePresetKey === null
                    ? "bg-primary text-white"
                    : "border border-neutral text-text-secondary hover:border-primary hover:text-primary"
                }`}
              >
                {activePresetKey === null ? "사용자 지정" : "고급 설정"}
              </button>
            </div>
          </div>

          {advancedOpen && (
            <Modal title="고급 설정 — 세부 기준 직접 조정" onClose={() => setAdvancedOpen(false)}>
              <StepWeights />
            </Modal>
          )}

          <p className="text-sm text-text-secondary">{displayedCombinations.length}개의 시간표 조합을 찾았습니다.</p>
          {displayedCombinations.length === 0 && (
            <p className="text-xs text-text-secondary">
              시간 충돌이 없는 조합이 없거나, 선택한 과목들의 학점 합이 {MIN_SCHOOL_CREDIT}~{MAX_SCHOOL_CREDIT}학점
              범위를 벗어났을 수 있어요. 그룹 구성이나 담은 과목을 확인해보세요.
            </p>
          )}

          <ul className="grid gap-2 sm:grid-cols-2">
            {displayedCombinations.map((combo, idx) => (
              <ComboCard
                key={comboKey(combo)}
                combo={combo}
                idx={idx}
                courseById={courseById}
                isSelected={selectedKey === comboKey(combo)}
                onSelect={handleSelectCombo}
              />
            ))}
          </ul>

          {selected && (
            <div ref={selectedDetailRef} className="space-y-3 rounded-lg border border-neutral/15 bg-surface p-3 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">선택한 시간표</h3>
                <p className="text-xs text-text-secondary">
                  {selectedCourses.length}과목 · {selected.totalCredit}학점
                </p>
              </div>

              {/* Stacked, not side-by-side -- at this page's max-w-2xl width, a
                  lg:grid-cols-2 split gives TimetableGrid roughly ~330px, well
                  under the ~416px it needs for 5 weekday columns at readable
                  size, so Thu/Fri ended up squeezed past the edge of an
                  internal scroll box that wasn't obviously scrollable (looked
                  cut off, not "scroll for more"). Full width removes the
                  squeeze entirely instead of relying on a scroll affordance. */}
              <div className="space-y-3 bg-background p-2">
                <TimetableGrid courses={selectedCourses} />
                <TimetableTable courses={selectedCourses} />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-neutral/20 pt-3">
                <button
                  type="button"
                  onClick={handleSaveTimetable}
                  className="rounded-full bg-primary-tint px-3 py-1 text-xs font-semibold text-primary transition-all duration-150 hover:bg-primary hover:text-white active:scale-95"
                >
                  {savedNotice ? "저장됨 ✓" : "★ 저장된 시간표에 추가"}
                </button>
                <span className="h-4 w-px bg-neutral/30" />
                <span className="text-xs font-medium text-text-secondary">내보내기</span>
                <span className="flex items-center gap-1 rounded-full border border-neutral pl-3 pr-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={handleExportPng}
                    className="py-1 transition-colors duration-150 hover:text-primary"
                  >
                    이미지(PNG)
                  </button>
                  <span className="h-3 w-px bg-neutral/30" />
                  <label className="flex items-center gap-1 rounded-full px-2 py-1 font-normal text-text-secondary hover:text-primary">
                    <input
                      type="checkbox"
                      checked={blackoutExport}
                      onChange={(e) => setBlackoutExport(e.target.checked)}
                    />
                    정보 가리기(색 블록만)
                  </label>
                </span>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportTxt}
                  className="rounded-full border border-neutral px-3 py-1 text-xs font-semibold transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
                >
                  텍스트
                </button>
              </div>

              {/* Off-screen (not display:none, so html-to-image can still rasterize it) --
                  the actual PNG export target: grid-only, 에타(Everytime)-style card, so the
                  shared image stays clean regardless of what's shown on screen above. */}
              <div className="fixed left-[-9999px] top-0" aria-hidden>
                <div ref={prettyExportRef}>
                  <TimetableExportCard courses={selectedCourses} blackout={blackoutExport} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
