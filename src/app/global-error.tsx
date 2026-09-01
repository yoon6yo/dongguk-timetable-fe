"use client";

import "./globals.css";

// Next.js requires this to render its own <html>/<body> -- it replaces the
// root layout entirely, since it exists specifically to catch errors thrown
// by that layout itself (which src/app/error.tsx cannot). Deliberately
// minimal and self-contained: no next/font, no Footer, nothing that could
// itself be the reason the root layout failed.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-lg font-bold">문제가 발생했어요</h1>
          <p className="text-sm text-text-secondary">페이지를 불러오는 중 오류가 발생했습니다.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
