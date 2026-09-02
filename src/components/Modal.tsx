"use client";

import { useEffect } from "react";

export function Modal({
  title,
  onClose,
  children,
  maxWidthClassName = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** max-w-lg fits a form (AddCustomEventModal, StepWeights' 고급 설정), but
   * a course-search table has up to 9 columns (강의명/학수번호/시간/강의실/
   * 경쟁률/교수명/학과/비고 + action buttons) -- at 512px, then even at
   * 768px, real rows still pushed the action column past the visible edge,
   * forcing a horizontal scroll just to click 담기. A real usability bug,
   * not a width-aesthetics one. Callers hosting a full CourseTable pass a
   * wide value (max-w-6xl). */
  maxWidthClassName?: string;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative flex max-h-[85vh] w-full ${maxWidthClassName} flex-col rounded-lg bg-surface shadow-card-hover`}>
        <div className="flex items-center justify-between border-b border-neutral/20 p-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md px-2 py-1 text-text-secondary transition-all duration-150 hover:text-error active:scale-95"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}
