"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { courseScheduleSegments } from "@/lib/courseScheduleSummary";
import { DAY_LABELS } from "@/lib/timeGrid";
import type { CourseRow } from "@/lib/types";
import { useCoursesStore } from "@/store/coursesStore";
import { useCustomEventsStore } from "@/store/customEventsStore";
import { groupDisplayName, useGroupsStore, type CourseGroup } from "@/store/groupsStore";
import { useWatchlistStore } from "@/store/watchlistStore";

import { CourseSearchPanel } from "../CourseSearchPanel";
import { CourseTable } from "../CourseTable";
import { Modal } from "../Modal";

interface DragData {
  courseId: number;
  sourceGroupId: string;
}

export function StepGroups() {
  const groups = useGroupsStore((s) => s.groups);
  const addGroup = useGroupsStore((s) => s.addGroup);
  const moveCourseBetweenGroups = useGroupsStore((s) => s.moveCourseBetweenGroups);
  const courses = useCoursesStore((s) => s.courses);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const [activeCourse, setActiveCourse] = useState<CourseRow | null>(null);

  // 포인터(마우스/터치) 뿐 아니라 키보드로도 그룹 간 과목 이동이 가능하도록 두 센서를 함께 등록.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  // "+ 그룹 추가"를 누르지 않아도 최소 1개 그룹은 항상 있어야 한다는 요구사항 —
  // 최초 진입뿐 아니라 마지막 그룹을 삭제했거나 학기 불일치로 초기화된 직후에도
  // 다시 빈 그룹 하나가 채워지도록 groups.length만 감시한다.
  useEffect(() => {
    if (groups.length === 0) addGroup();
  }, [groups.length, addGroup]);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    if (!data) return;
    setActiveCourse(courseById.get(data.courseId) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCourse(null);
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
        꼭 골라야 하는지(필수) 안 골라도 되는지(선택)만 정하면 됩니다. 담은 과목 옆의 점 6개 손잡이를
        끌어다 다른 그룹에 놓으면 과목을 옮길 수 있어요.
      </p>

      <button
        type="button"
        onClick={() => addGroup()}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none"
      >
        + 그룹 추가
      </button>

      {/* Reverted to a full-width single-column stack -- a group card holds
          a growing CourseTable (학수번호/시간/강의실/경쟁률 columns), and
          squeezing that into a fixed half-width grid cell recreated the
          exact "table content forced narrower than it needs" problem the
          add-course modal had. An empty/sparse group card being wide isn't
          the actual defect; a *stretched, mostly-empty-looking* one is --
          GroupCard's own padding/layout is what should stay tight, not the
          container width. */}
      <div className="space-y-3">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveCourse(null)}>
          {groups.map((group, index) => (
            <GroupCard key={group.id} group={group} index={index} courses={courses} courseById={courseById} />
          ))}
          {groups.length === 0 && <p className="text-sm text-text-secondary">아직 만든 그룹이 없습니다.</p>}
          <DragOverlay dropAnimation={null}>
            {activeCourse && <DraggedRowPreview course={activeCourse} />}
          </DragOverlay>
        </DndContext>
      </div>

      <CustomEventsSection />
    </div>
  );
}

/**
 * Lighter-weight than GroupCard (no header row, no title, tighter padding),
 * not chrome-less -- a completely unboxed text row read as unfinished
 * rather than "quietly secondary." DESIGN.md §2 keeps shadow-card on cards
 * for a reason (content-dense/chrome-light means restrained chrome, not
 * zero chrome); the demotion relative to a real course group should come
 * from content and size, not from dropping the card treatment entirely.
 */
function CustomEventsSection() {
  const events = useCustomEventsStore((s) => s.events);
  const removeEvent = useCustomEventsStore((s) => s.removeEvent);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-neutral/15 bg-surface px-3 py-2.5 text-xs shadow-card">
      <span className="font-medium text-text-secondary">개인 일정</span>
      {events.length === 0 ? (
        <span className="text-text-secondary">아르바이트·동아리 등도 시간표에 넣고 충돌 검사할 수 있어요.</span>
      ) : (
        events.map((event) => (
          <span key={event.id} className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2 py-1">
            {event.name} · {DAY_LABELS[event.dayOfWeek]} {event.startTime}~{event.endTime}
            <button
              type="button"
              onClick={() => removeEvent(event.id)}
              aria-label={`${event.name} 삭제`}
              className="text-text-secondary hover:text-error"
            >
              ×
            </button>
          </span>
        ))
      )}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="font-semibold text-primary underline decoration-primary-tint underline-offset-2 transition-colors hover:text-primary-hover"
      >
        + 추가
      </button>

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
      className={`rounded-lg border p-3 shadow-card transition-shadow hover:shadow-card-hover ${
        isOver ? "border-primary/40 ring-2 ring-primary" : "border-neutral/15"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={group.name}
          onChange={(e) => renameGroup(group.id, e.target.value)}
          placeholder={displayName}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent text-sm font-semibold outline-none transition-colors hover:border-neutral focus:border-primary placeholder:font-semibold placeholder:text-foreground"
        />
        <div className="flex shrink-0 items-center gap-1">
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
            className="rounded-md px-1.5 py-1 text-xs text-text-secondary transition-all duration-150 hover:text-error active:scale-95"
          >
            삭제
          </button>
        </div>
      </div>

      {group.courseIds.length > 0 && (
        <div className="mt-2 bg-primary-tint">
          <CourseTable
            courses={group.courseIds.map((id) => courseById.get(id)).filter((c): c is CourseRow => Boolean(c))}
            renderLeading={(course) => (
              <DragHandle groupId={group.id} courseId={course.id} courseName={course.courseName} />
            )}
            renderAction={(course) => (
              <button
                type="button"
                onClick={() => removeCourseFromGroup(group.id, course.id)}
                aria-label={`${course.courseName} 제거`}
                className="text-text-secondary hover:text-error"
              >
                ×
              </button>
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

// 드래그 중 커서를 따라다니는 미리보기 -- CourseTable 행의 실제 스타일(text-xs,
// p-2, border-neutral/40 등)을 그대로 재현해 "표에서 그대로 들어올려진" 것처럼
// 보이게 한다. 통짜 알약 모양 라벨이었던 이전 버전은 표 안의 실제 모양과 달라
// 보인다는 피드백으로 교체함.
function DraggedRowPreview({ course }: { course: CourseRow }) {
  const segments = courseScheduleSegments(course);
  const timeLabel = segments.length > 0 ? segments.map((s) => s.timeLabel).join(" / ") : "시간 미정";

  return (
    <table className="w-max rounded-lg bg-surface text-xs shadow-card-hover">
      <tbody>
        <tr className="border border-neutral/40">
          <td className="max-w-[10rem] truncate p-2 font-medium">{course.courseName}</td>
          <td className="max-w-[12rem] truncate p-2 text-text-secondary">{timeLabel}</td>
        </tr>
      </tbody>
    </table>
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
      title="끌어서 다른 그룹으로 이동"
      aria-label={`${courseName} 다른 그룹으로 이동`}
      className={`flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-1 text-text-secondary hover:bg-neutral/20 hover:text-primary active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <circle cx="6" cy="5" r="1.5" />
        <circle cx="14" cy="5" r="1.5" />
        <circle cx="6" cy="10" r="1.5" />
        <circle cx="14" cy="10" r="1.5" />
        <circle cx="6" cy="15" r="1.5" />
        <circle cx="14" cy="15" r="1.5" />
      </svg>
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
  const watchedIds = useWatchlistStore((s) => s.courseIds);
  const addWatchCourse = useWatchlistStore((s) => s.addCourse);
  const removeWatchCourse = useWatchlistStore((s) => s.removeCourse);

  return (
    <Modal title={`"${displayName}"에 과목 추가`} onClose={onClose} maxWidthClassName="max-w-6xl">
      <CourseSearchPanel
        courses={courses}
        defaultSort="default"
        resultsMaxHeightClassName="max-h-96"
        renderAction={(course) => {
          const alreadyAdded = group.courseIds.includes(course.id);
          const watched = watchedIds.includes(course.id);
          return (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => (watched ? removeWatchCourse(course.id) : addWatchCourse(course.id))}
                aria-label={watched ? `${course.courseName} 관심목록에서 제거` : `${course.courseName} 관심목록에 추가`}
                title="관심목록에 추가 — 그룹과 별개로 경쟁률만 추적"
                className={`px-0.5 text-sm transition-colors duration-150 ${
                  watched ? "text-primary" : "text-neutral hover:text-primary"
                }`}
              >
                ★
              </button>
              <button
                type="button"
                disabled={alreadyAdded}
                onClick={() => addCourseToGroup(group.id, course.id, semesterCode)}
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none disabled:scale-100 disabled:bg-neutral/30 disabled:text-text-secondary disabled:shadow-none"
              >
                {alreadyAdded ? "담김" : "담기"}
              </button>
            </div>
          );
        }}
      />
    </Modal>
  );
}
