import { DAY_LABELS, formatScheduleTime } from "./timeGrid";
import type { CourseRow } from "./types";

/**
 * One compact "화,목 15:00~16:30 · 342호" line per course, for places that
 * need to identify a specific section at a glance (added-course list, search
 * results) without a full per-slot table. Groups by (time, classroom) since
 * every observed course shares one classroom/time pair across its meeting
 * days (see BE docs/ndrims-response-notes.md) -- falls back to raw text when
 * a slot failed to parse into day/time, and to a plain "시간 미정" when there's
 * no schedule data at all.
 */
export function describeCourseSchedule(course: CourseRow): string {
  const slots = course.schedules;
  if (slots.length === 0) return "시간 미정";

  const groups = new Map<string, { days: number[]; start: string | null; end: string | null; classroom: string | null; rawText: string }>();
  for (const slot of slots) {
    const start = formatScheduleTime(slot.startTime);
    const end = formatScheduleTime(slot.endTime);
    // Grouped purely by time+classroom -- rawText is only a display fallback
    // (used when day/time failed to parse) and must not affect grouping.
    const key = `${start ?? ""}-${end ?? ""}-${slot.classroom ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      if (slot.dayOfWeek != null) existing.days.push(slot.dayOfWeek);
    } else {
      groups.set(key, {
        days: slot.dayOfWeek != null ? [slot.dayOfWeek] : [],
        start,
        end,
        classroom: slot.classroom,
        rawText: slot.rawText,
      });
    }
  }

  return Array.from(groups.values())
    .map((g) => {
      const dayLabel = g.days.map((d) => DAY_LABELS[d] ?? "").join(",");
      const timeLabel = g.start && g.end ? `${g.start}~${g.end}` : null;
      const core = dayLabel && timeLabel ? `${dayLabel} ${timeLabel}` : g.rawText;
      return g.classroom ? `${core} · ${g.classroom}` : core;
    })
    .join(" / ");
}
