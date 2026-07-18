export const DAY_LABELS: Record<number, string> = { 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토", 7: "일" };

export interface GridLayout {
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  totalRows: number;
}

const DEFAULT_START_MINUTES = 9 * 60;
const DEFAULT_END_MINUTES = 18 * 60;

/** Grid always covers at least 09:00–18:00, widening to fit any block outside that range. */
export function computeGridLayout(
  blocks: { startMinutes: number; endMinutes: number }[],
  slotMinutes = 30
): GridLayout {
  const starts = blocks.map((b) => b.startMinutes);
  const ends = blocks.map((b) => b.endMinutes);
  const earliestStart = starts.length ? Math.min(DEFAULT_START_MINUTES, ...starts) : DEFAULT_START_MINUTES;
  const latestEnd = ends.length ? Math.max(DEFAULT_END_MINUTES, ...ends) : DEFAULT_END_MINUTES;

  const startMinutes = Math.floor(earliestStart / slotMinutes) * slotMinutes;
  const endMinutes = Math.ceil(latestEnd / slotMinutes) * slotMinutes;

  return { startMinutes, endMinutes, slotMinutes, totalRows: (endMinutes - startMinutes) / slotMinutes };
}

/** 1-indexed CSS grid-row start + span for a block within the given layout. */
export function rowRange(block: { startMinutes: number; endMinutes: number }, layout: GridLayout): {
  start: number;
  span: number;
} {
  const start = Math.floor((block.startMinutes - layout.startMinutes) / layout.slotMinutes) + 1;
  const span = Math.max(1, Math.ceil((block.endMinutes - block.startMinutes) / layout.slotMinutes));
  return { start, span };
}

/** Which day columns to render — Mon–Fri always, Sat/Sun only if actually used. */
export function activeDayColumns(blocks: { dayOfWeek: number }[]): number[] {
  const weekend = [6, 7].filter((day) => blocks.some((b) => b.dayOfWeek === day));
  return [1, 2, 3, 4, 5, ...weekend];
}
