import { DAY_LABELS, formatScheduleTime } from "./timeGrid";
import type { CourseRow } from "./types";

export interface ScheduleSegment {
  /** "화,목 15:00~16:30", or the raw schedule text when day/time failed to parse. */
  timeLabel: string;
  classroom: string | null;
}

/**
 * Groups a course's schedule rows by (time, classroom) into display segments
 * -- every observed course shares one classroom/time pair across its meeting
 * days (see BE docs/ndrims-response-notes.md), so this is almost always a
 * single segment. Falls back to raw text per-segment when day/time failed to
 * parse, and to [] when there's no schedule data at all.
 */
export function courseScheduleSegments(course: CourseRow): ScheduleSegment[] {
  const slots = course.schedules;
  if (slots.length === 0) return [];

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

  return Array.from(groups.values()).map((g) => {
    const dayLabel = g.days.map((d) => DAY_LABELS[d] ?? "").join(",");
    const timeLabel = g.start && g.end ? `${g.start}~${g.end}` : null;
    const fallback = course.lectureStyle === "사이버강의" ? "사이버강의" : g.rawText;
    return {
      timeLabel: dayLabel && timeLabel ? `${dayLabel} ${timeLabel}` : fallback,
      classroom: g.classroom,
    };
  });
}

/** One compact "화,목 15:00~16:30 · 342호" line per course -- for places that
 * just need a single-line summary (search results), not a table. */
export function describeCourseSchedule(course: CourseRow): string {
  const segments = courseScheduleSegments(course);
  if (segments.length === 0) return "시간 미정";
  return segments.map((s) => (s.classroom ? `${s.timeLabel} · ${s.classroom}` : s.timeLabel)).join(" / ");
}
