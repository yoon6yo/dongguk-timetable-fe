"use client";

import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useMemo, useState, type FormEvent } from "react";

import { listColleges, listCourseTypes, listDepartments, searchCourses, type CourseSortOption } from "@/lib/courseSearch";
import { computeCreditRangeWarning, type CreditRangeWarning } from "@/lib/creditRangeWarning";
import { DAY_LABELS } from "@/lib/timeGrid";
import type { CourseRow } from "@/lib/types";
import { MAX_SCHOOL_CREDIT, MIN_SCHOOL_CREDIT, useCreditLimitStore } from "@/store/creditLimitStore";
import { useCoursesStore } from "@/store/coursesStore";
import { useCustomEventsStore } from "@/store/customEventsStore";
import { groupDisplayName, useGroupsStore, type CourseGroup } from "@/store/groupsStore";
import { useWizardStore } from "@/store/wizardStore";

import { CourseTable } from "../CourseTable";
import { Modal } from "../Modal";

const SEARCH_RESULT_LIMIT = 50;

interface DragData {
  courseId: number;
  sourceGroupId: string;
}

export function StepGroups() {
  const groups = useGroupsStore((s) => s.groups);
  const addGroup = useGroupsStore((s) => s.addGroup);
  const moveCourseBetweenGroups = useGroupsStore((s) => s.moveCourseBetweenGroups);
  const courses = useCoursesStore((s) => s.courses);
  const maxCredit = useCreditLimitStore((s) => s.maxCredit);
  const hasAttemptedGenerate = useWizardStore((s) => s.hasAttemptedGenerate);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const warning = useMemo(
    () => computeCreditRangeWarning(groups, courseById, MIN_SCHOOL_CREDIT, maxCredit ?? MAX_SCHOOL_CREDIT),
    [groups, courseById, maxCredit]
  );

  // 포인터(마우스/터치) 뿐 아니라 키보드로도 그룹 간 과목 이동이 가능하도록 두 센서를 함께 등록.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const data = active.data.current as DragData | undefined;
    if (!data) return;
    const targetGroupId = String(over.id);
    if (targetGroupId === data.sourceGroupId) return;
    moveCourseBetweenGroups(data.sourceGroupId, targetGroupId, data.courseId);
  }

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">
        그룹을 만들고 각 그룹에 후보 과목을 담으세요. 그룹 이름은 안 정해도 괜찮아요 — 그룹에서 한 과목을
        꼭 골라야 하는지(필수) 안 골라도 되는지(선택)만 정하면 됩니다. 과목을 다른 그룹으로 옮기려면
        ⠿ 손잡이를 끌어다 놓으세요.
      </p>

      {hasAttemptedGenerate && warning && <CreditRangeWarningBanner warning={warning} />}

      <button
        type="button"
        onClick={() => addGroup()}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none"
      >
        + 그룹 추가
      </button>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {groups.map((group, index) => (
            <GroupCard key={group.id} group={group} index={index} courses={courses} courseById={courseById} />
          ))}
          {groups.length === 0 && <p className="text-sm text-text-secondary">아직 만든 그룹이 없습니다.</p>}
        </div>
      </DndContext>

      <CustomEventsSection />
    </div>
  );
}

function CustomEventsSection() {
  const events = useCustomEventsStore((s) => s.events);
  const removeEvent = useCustomEventsStore((s) => s.removeEvent);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="rounded-xl bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">개인 일정</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="text-xs font-semibold text-primary underline decoration-primary-tint underline-offset-2 transition-colors hover:text-primary-hover"
        >
          + 개인 일정 추가
        </button>
      </div>
      <p className="mt-1 text-xs text-text-secondary">
        아르바이트·동아리처럼 정규 과목이 아닌 일정도 시간표에 넣고 충돌 검사에 똑같이 반영할 수 있어요.
      </p>
      {events.length > 0 && (
        <ul className="mt-2 space-y-1">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between rounded-lg bg-primary-tint px-2 py-1 text-xs">
              <span>
                {event.name} · {DAY_LABELS[event.dayOfWeek]} {event.startTime}~{event.endTime}
              </span>
              <button
                type="button"
                onClick={() => removeEvent(event.id)}
                aria-label={`${event.name} 삭제`}
                className="text-text-secondary hover:text-error"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {addOpen && <AddCustomEventModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddCustomEventModal({ onClose }: { onClose: () => void }) {
  const addEvent = useCustomEventsStore((s) => s.addEvent);
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError("일정 이름을 입력해주세요.");
      return;
    }
    if (startTime >= endTime) {
      setValidationError("종료 시각은 시작 시각보다 늦어야 합니다.");
      return;
    }
    addEvent({ name: name.trim(), dayOfWeek: Number(dayOfWeek), startTime, endTime });
    onClose();
  }

  return (
    <Modal title="개인 일정 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="일정 이름 (예: 아르바이트)"
          autoFocus
          className="w-full rounded-lg border border-neutral px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <div className="grid grid-cols-3 gap-2">
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="rounded-lg border border-neutral px-2 py-1.5 text-sm"
          >
            {Object.entries(DAY_LABELS).map(([day, label]) => (
              <option key={day} value={day}>
                {label}요일
              </option>
            ))}
          </select>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-lg border border-neutral px-2 py-1.5 text-sm"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-lg border border-neutral px-2 py-1.5 text-sm"
          />
        </div>
        {validationError && <p className="text-xs text-error">{validationError}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95"
        >
          추가
        </button>
      </form>
    </Modal>
  );
}

function CreditRangeWarningBanner({ warning }: { warning: CreditRangeWarning }) {
  const message =
    warning.type === "empty-required"
      ? `"${warning.groupName}" 그룹이 필수인데 담긴 과목이 없어요 — 과목을 최소 1개 담아야 조합을 만들 수 있어요.`
      : warning.type === "above-max"
        ? `필수 그룹만 골라도 최소 ${warning.minPossible}학점이라 목표 학점(${warning.maxCredit}학점)을 넘어요 — 필수 그룹을 줄이거나 학점이 적은 과목을 담아보세요.`
        : `필수 그룹만으로는 최대 ${warning.maxPossible}학점이라 최소 학점(${warning.minCredit}학점)에 못 미쳐요 — 선택 그룹에서 과목을 더 담아보세요.`;

  return <div className="rounded-xl bg-error/10 p-3 text-sm text-error shadow-card">⚠ {message}</div>;
}

function GroupCard({
  group,
  index,
  courses,
  courseById,
}: {
  group: CourseGroup;
  index: number;
  courses: CourseRow[];
  courseById: Map<number, CourseRow>;
}) {
  const renameGroup = useGroupsStore((s) => s.renameGroup);
  const removeGroup = useGroupsStore((s) => s.removeGroup);
  const toggleRequired = useGroupsStore((s) => s.toggleRequired);
  const removeCourseFromGroup = useGroupsStore((s) => s.removeCourseFromGroup);

  const [searchOpen, setSearchOpen] = useState(false);
  const displayName = groupDisplayName(group, index);
  const { setNodeRef, isOver } = useDroppable({ id: group.id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl bg-surface p-3 shadow-card transition-shadow hover:shadow-card-hover ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={group.name}
          onChange={(e) => renameGroup(group.id, e.target.value)}
          placeholder={displayName}
          className="rounded border border-transparent bg-transparent font-medium outline-none transition-colors hover:border-neutral focus:border-primary placeholder:font-normal placeholder:text-text-secondary"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleRequired(group.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              group.required ? "bg-primary text-white" : "bg-neutral/30 text-text-secondary hover:bg-neutral/50"
            }`}
          >
            {group.required ? "필수" : "선택"}
          </button>
          <button
            type="button"
            onClick={() => removeGroup(group.id)}
            aria-label={`${displayName} 그룹 삭제`}
            className="rounded-md px-1 text-text-secondary transition-all duration-150 hover:text-error active:scale-95"
          >
            삭제
          </button>
        </div>
      </div>

      {group.courseIds.length > 0 && (
        <div className="mt-2 bg-primary-tint">
          <CourseTable
            courses={group.courseIds.map((id) => courseById.get(id)).filter((c): c is CourseRow => Boolean(c))}
            mode="segments"
            renderAction={(course) => (
              <div className="flex items-center gap-1">
                <DragHandle groupId={group.id} courseId={course.id} courseName={course.courseName} />
                <button
                  type="button"
                  onClick={() => removeCourseFromGroup(group.id, course.id)}
                  aria-label={`${course.courseName} 제거`}
                  className="text-text-secondary hover:text-error"
                >
                  ×
                </button>
              </div>
            )}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="mt-2 text-xs font-semibold text-primary underline decoration-primary-tint underline-offset-2 transition-colors hover:text-primary-hover"
      >
        + 과목 추가
      </button>

      {searchOpen && (
        <AddCourseModal
          group={group}
          displayName={displayName}
          courses={courses}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

function DragHandle({ groupId, courseId, courseName }: { groupId: string; courseId: number; courseName: string }) {
  const data: DragData = { courseId, sourceGroupId: groupId };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${groupId}:${courseId}`,
    data,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      aria-label={`${courseName} 다른 그룹으로 이동`}
      className={`cursor-grab touch-none text-text-secondary hover:text-primary active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      ⠿
    </button>
  );
}

function AddCourseModal({
  group,
  displayName,
  courses,
  onClose,
}: {
  group: CourseGroup;
  displayName: string;
  courses: CourseRow[];
  onClose: () => void;
}) {
  const addCourseToGroup = useGroupsStore((s) => s.addCourseToGroup);
  const semesterCode = useCoursesStore((s) => s.semester)?.semesterCode;
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [courseType, setCourseType] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [sort, setSort] = useState<CourseSortOption>("default");
  const [queryInput, setQueryInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  // 한글 입력은 IME로 자모가 조합되는 도중에도 onChange가 매 타이핑마다 발생하므로,
  // 조합이 끝나지 않은 마지막 글자를 검색어에서 제외해 오검색을 피한다.
  const query = isComposing ? queryInput.slice(0, -1) : queryInput;

  const colleges = useMemo(() => listColleges(courses), [courses]);
  const departments = useMemo(() => listDepartments(courses, college || undefined), [courses, college]);
  const courseTypes = useMemo(() => listCourseTypes(courses), [courses]);
  const allResults = useMemo(
    () =>
      searchCourses(courses, {
        college: college || undefined,
        department: department || undefined,
        courseType: courseType || undefined,
        dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined,
        sort,
        query,
      }),
    [courses, college, department, courseType, dayOfWeek, sort, query]
  );
  const results = allResults.slice(0, SEARCH_RESULT_LIMIT);

  return (
    <Modal title={`"${displayName}"에 과목 추가`} onClose={onClose}>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              setDepartment("");
            }}
            className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
          >
            <option value="">전체 단과대</option>
            {colleges.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
          >
            <option value="">전체 학과</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={courseType}
            onChange={(e) => setCourseType(e.target.value)}
            className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
          >
            <option value="">전체 영역구분</option>
            {courseTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
          >
            <option value="">전체 요일</option>
            {Object.entries(DAY_LABELS).map(([day, label]) => (
              <option key={day} value={day}>
                {label}요일
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CourseSortOption)}
            className="rounded-lg border border-neutral px-2 py-1.5 text-xs"
          >
            <option value="default">기본 순서</option>
            <option value="competition">경쟁률순</option>
            <option value="credit">학점순</option>
          </select>
        </div>

        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            setQueryInput(e.currentTarget.value);
          }}
          placeholder="과목명 / 학수번호 / 교수명 검색"
          autoFocus
          className="w-full rounded-lg border border-neutral px-2 py-1.5 text-xs outline-none focus:border-primary"
        />

        {allResults.length > SEARCH_RESULT_LIMIT && (
          <p className="text-[11px] text-text-secondary">
            검색 결과가 많아 상위 {SEARCH_RESULT_LIMIT}개만 보여드려요 — 검색어나 단과대/학과로 좁혀보세요.
          </p>
        )}

        <div className="max-h-96 overflow-y-auto">
          <CourseTable
            courses={results}
            mode="segments"
            showRemarks
            emptyMessage="검색 결과가 없습니다."
            extraColumns={[
              { key: "dept", header: "학과", render: ({ course }) => course.department ?? course.college },
            ]}
            renderAction={(course) => {
              const alreadyAdded = group.courseIds.includes(course.id);
              return (
                <button
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => addCourseToGroup(group.id, course.id, semesterCode)}
                  className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
                >
                  {alreadyAdded ? "담김" : "담기"}
                </button>
              );
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
