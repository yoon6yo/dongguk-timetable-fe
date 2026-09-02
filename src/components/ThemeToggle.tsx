"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "timetable-theme";
type Theme = "light" | "dark";

function applyTheme(theme: Theme | null) {
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function readStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function readServerTheme(): Theme | null {
  return null;
}

function subscribeStoredTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readServerSystemDark(): boolean {
  return false;
}

function subscribeSystemDark(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/**
 * Explicit override on top of the system prefers-color-scheme default (see
 * globals.css). useSyncExternalStore, not useState+useEffect -- this repo's
 * lint config forbids calling setState synchronously inside an effect (see
 * groupsStore.ts's own note on the same rule), and localStorage/matchMedia
 * are exactly the "external, non-React mutable state read during render"
 * case that hook exists for: it resolves cleanly to null/false during SSR
 * (no window) via the given server snapshots, then re-syncs on the client
 * without a hydration-mismatch flash or an extra render-triggering effect.
 */
export function ThemeToggle() {
  const stored = useSyncExternalStore(subscribeStoredTheme, readStoredTheme, readServerTheme);
  const systemDark = useSyncExternalStore(subscribeSystemDark, readSystemDark, readServerSystemDark);
  const isDark = stored ? stored === "dark" : systemDark;

  const toggle = useCallback(() => {
    const next: Theme = isDark ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    // The native "storage" event only fires in *other* tabs, not this one --
    // dispatch it manually so this tab's useSyncExternalStore re-reads too.
    window.dispatchEvent(new Event("storage"));
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="inline-flex h-4 w-4 items-center justify-center text-text-secondary transition-colors hover:text-primary"
    >
      {isDark ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M10 2.5a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1A.75.75 0 0110 2.5zM10 15a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1A.75.75 0 0110 15zM17.5 10a.75.75 0 01-.75.75h-1a.75.75 0 010-1.5h1a.75.75 0 01.75.75zM5 10a.75.75 0 01-.75.75h-1a.75.75 0 010-1.5h1A.75.75 0 015 10zM15.36 15.36a.75.75 0 01-1.06 0l-.71-.71a.75.75 0 111.06-1.06l.71.71a.75.75 0 010 1.06zM7.41 7.41a.75.75 0 01-1.06 0l-.71-.71a.75.75 0 011.06-1.06l.71.71a.75.75 0 010 1.06zM15.36 4.64a.75.75 0 010 1.06l-.71.71a.75.75 0 11-1.06-1.06l.71-.71a.75.75 0 011.06 0zM7.41 12.59a.75.75 0 010 1.06l-.71.71a.75.75 0 01-1.06-1.06l.71-.71a.75.75 0 011.06 0zM10 6a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path
            fillRule="evenodd"
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

/** Runs before hydration (inlined into layout.tsx's <head>) so the correct
 * theme is set before first paint -- without this, a dark-preferring OS with
 * a stored "light" override would flash dark, then snap to light on mount. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${STORAGE_KEY}");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;
