import { timeToMinutes } from "@/lib/conflict";
import { courseBackgroundColor, courseTextColor } from "@/lib/courseColor";
import { activeDayColumns, computeGridLayout, DAY_LABELS, rowRange } from "@/lib/timeGrid";
import type { CourseRow } from "@/lib/types";

interface RenderBlock {
  course: CourseRow;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  classroom: string | null;
}

function splitBlocks(courses: CourseRow[]): { blocks: RenderBlock[]; unparsed: { course: CourseRow; rawText: string }[] } {
  const blocks: RenderBlock[] = [];
  const unparsed: { course: CourseRow; rawText: string }[] = [];

  for (const course of courses) {
    for (const schedule of course.schedules) {
      if (schedule.dayOfWeek == null || !schedule.startTime || !schedule.endTime) {
        unparsed.push({ course, rawText: schedule.rawText });
        continue;
      }
      blocks.push({
        course,
        dayOfWeek: schedule.dayOfWeek,
        startMinutes: timeToMinutes(schedule.startTime),
        endMinutes: timeToMinutes(schedule.endTime),
        classroom: schedule.classroom,
      });
    }
  }

  return { blocks, unparsed };
}

function formatHourLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)}:00`;
}

export function TimetableGrid({ courses, compact = false }: { courses: CourseRow[]; compact?: boolean }) {
  const { blocks, unparsed } = splitBlocks(courses);
  const layout = computeGridLayout(blocks);
  const dayColumns = activeDayColumns(blocks);
  const rowIndexes = Array.from({ length: layout.totalRows }, (_, i) => i);

  const headerHeight = compact ? "1.4rem" : "2.25rem";
  const rowHeight = compact ? "1.05rem" : "1.6rem";
  const colWidth = compact ? 3 : 4.5;
  const timeColWidth = compact ? 2.25 : 3.5;

  return (
    <div>
      {/* Grid columns use a fixed minWidth (not just 1fr) so on narrow viewports
          the day columns stay legible and the container scrolls horizontally
          instead of squeezing every column unreadably thin. */}
      <div className="overflow-x-auto rounded-lg border border-neutral">
        <div
          className={compact ? "grid text-[10px]" : "grid text-sm"}
          style={{
            gridTemplateColumns: `${timeColWidth}rem repeat(${dayColumns.length}, minmax(${colWidth}rem, 1fr))`,
            gridTemplateRows: `${headerHeight} repeat(${layout.totalRows}, ${rowHeight})`,
            minWidth: `${timeColWidth + dayColumns.length * colWidth}rem`,
          }}
        >
          <div className="border-b border-r border-neutral bg-surface" style={{ gridColumn: 1, gridRow: 1 }} />
          {dayColumns.map((day, colIdx) => (
            <div
              key={day}
              className="flex items-center justify-center border-b border-r border-neutral bg-surface font-medium"
              style={{ gridColumn: colIdx + 2, gridRow: 1 }}
            >
              {DAY_LABELS[day]}
            </div>
          ))}

          {rowIndexes.map((rowIdx) => {
            const minutes = layout.startMinutes + rowIdx * layout.slotMinutes;
            return (
              <div
                key={`time-${rowIdx}`}
                className="flex items-start justify-end border-b border-r border-neutral pr-1 text-[11px] text-text-secondary"
                style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
              >
                {minutes % 60 === 0 ? formatHourLabel(minutes) : ""}
              </div>
            );
          })}

          {dayColumns.map((day, colIdx) =>
            rowIndexes.map((rowIdx) => (
              <div
                key={`cell-${day}-${rowIdx}`}
                className="border-b border-r border-neutral"
                style={{ gridColumn: colIdx + 2, gridRow: rowIdx + 2 }}
              />
            ))
          )}

          {blocks.map((block, idx) => {
            const colIdx = dayColumns.indexOf(block.dayOfWeek);
            if (colIdx === -1) return null;
            const { start, span } = rowRange(block, layout);
            const background = courseBackgroundColor(block.course.id);
            const color = courseTextColor(block.course.id);
            return (
              <div
                key={idx}
                className={
                  compact
                    ? "overflow-hidden rounded-sm px-0.5 leading-tight"
                    : "m-0.5 overflow-hidden rounded-md px-1 py-0.5 text-[11px] leading-tight"
                }
                style={{
                  gridColumn: colIdx + 2,
                  gridRow: `${start + 1} / span ${span}`,
                  backgroundColor: background,
                  color,
                }}
              >
                <div className="truncate font-semibold">{block.course.courseName}</div>
                {!compact && block.classroom && <div className="truncate opacity-80">{block.classroom}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {!compact && unparsed.length > 0 && (
        <div className="mt-2 rounded-md border border-error/40 bg-error/5 p-2 text-xs text-error">
          시간표 자동 인식에 실패한 항목이 있습니다 — 직접 확인해 주세요:
          <ul className="list-inside list-disc">
            {unparsed.map((u, i) => (
              <li key={i}>
                {u.course.courseName}: {u.rawText}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
