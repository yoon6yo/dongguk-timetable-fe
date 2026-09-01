import { defineConfig, devices } from "@playwright/test";

// Targets the live deployment by default. The FE is DB-read-only (see
// README/DESIGN.md — MySQL writes belong solely to dongguk-timetable-be), and
// every wizard interaction (groups, saved timetables, watchlist) persists to
// the browser's own localStorage, never to the server — so running these
// against production is safe and, unlike a local `npm run dev` server (which
// has no MySQL to read from in this sandbox), actually exercises real data.
// Override with E2E_BASE_URL to point at a local server that has DB access.
const baseURL = process.env.E2E_BASE_URL ?? "https://dongguk-timetable.duckdns.org";

export default defineConfig({
  testDir: "./e2e",
  // Sequential, not parallel: the ingress in front of this app rate-limits
  // at 5 req/s per IP (k8s/ingress.yaml `limit-rps: 5`). Running projects in
  // parallel from one CI/sandbox IP self-triggers that limiter (503s) rather
  // than testing anything real about the app.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // 1 retry even locally, not just CI: this suite targets the live,
  // rate-limited production site rather than a disposable local server, so
  // an occasional transient 503 from the ingress limiter (or from the site
  // being hit by something else at the same moment) is expected noise, not
  // a real failure -- confirmed by rerunning individually-failing tests in
  // isolation and seeing them pass.
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
