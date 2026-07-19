/** Client-only: creates a throwaway anchor to trigger a browser download.
 * Shared by every export path (PNG, CSV) — must only ever be called from a
 * browser event handler. */
export function triggerBrowserDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  link.click();
}
