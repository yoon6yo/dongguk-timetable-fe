/**
 * Client-only PNG export of a DOM node (the timetable grid). Dynamically
 * imports html-to-image so nothing canvas/document-related is ever touched
 * during SSR — this must only ever be called from a browser event handler.
 */
export async function exportElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: "#ffffff" });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
