/** Renders a sync timestamp (ISO string from the DB, or null if that sync
 * has never happened) as a short "M/D HH:MM" label in the viewer's local
 * timezone, or a fallback when there's nothing yet. */
export function formatSyncTime(iso: string | null): string {
  if (!iso) return "정보 없음";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "정보 없음";

  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
