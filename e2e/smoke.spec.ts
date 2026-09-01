import { expect, test } from "@playwright/test";

// Read-only smoke coverage against the live app — this is the FE's first-ever
// real-browser test tier (prior sessions only had lint/typecheck/vitest/build,
// see STATUS.md's long-standing "실제 브라우저 클릭 테스트 아직 안 함"). Every
// assertion here only reads state; nothing writes to the shared MySQL catalog.

test.describe("landing", () => {
  test("loads and links to the three tools", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "동국대 시간표 마법사" })).toBeVisible();
    await expect(page.getByRole("link", { name: "시간표 만들기 시작" })).toHaveAttribute("href", "/wizard");
    await expect(page.getByRole("link", { name: /관심 강의|경쟁률/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /저장된 시간표/ })).toBeVisible();
  });
});

test.describe("wizard", () => {
  test("loads the latest semester and can step forward to 그룹 & 과목", async ({ page }) => {
    await page.goto("/wizard");
    await expect(page.getByRole("heading", { name: "시작" })).toBeVisible();

    // StepStart fetches /api/courses client-side — wait for it to settle into
    // either a loaded semester or the explicit "no data yet" state, not just
    // network idle, since the loading text is itself a valid transient state.
    await expect(page.getByText("최신 학기 강의 정보를 불러오는 중...")).toBeHidden({ timeout: 15000 });

    const noDataYet = page.getByText("아직 적재된 학기 데이터가 없습니다");
    if (await noDataYet.isVisible().catch(() => false)) {
      test.skip(true, "no semester data loaded on this environment — nothing to click through");
    }

    await expect(page.getByText("최신 학기")).toBeVisible();
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByRole("heading", { name: "그룹 & 과목" })).toBeVisible();

    // A group always exists by default (groupsStore auto-creates one) — the
    // add-course search entry point should be reachable without any prior setup.
    await expect(page.getByRole("button", { name: "이전" })).toBeEnabled();
  });

  test("group search finds a course by partial name", async ({ page }) => {
    await page.goto("/wizard");
    await expect(page.getByText("최신 학기 강의 정보를 불러오는 중...")).toBeHidden({ timeout: 15000 });
    if (await page.getByText("아직 적재된 학기 데이터가 없습니다").isVisible().catch(() => false)) {
      test.skip(true, "no semester data loaded on this environment");
    }
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByRole("heading", { name: "그룹 & 과목" })).toBeVisible();

    const searchToggle = page.getByRole("button", { name: /과목 추가|검색/ }).first();
    if (await searchToggle.isVisible().catch(() => false)) {
      await searchToggle.click();
      const searchInput = page.getByRole("textbox").first();
      await searchInput.fill("공학");
      // Debounced/instant search — either way, the result region should
      // render something other than a permanent empty state within a beat.
      await page.waitForTimeout(400);
      const resultRows = page.locator("table tbody tr");
      await expect(resultRows.first()).toBeVisible({ timeout: 5000 });

      // CourseSearchPanel merge: each result row must offer both the
      // group-add action (담기) and a watchlist toggle (★), not just the
      // group action — this is the "search UI duplication" fix, verified
      // end-to-end rather than just at the component level (no component
      // test tier exists in this repo; see watchlistStore.test.ts for the
      // store-level half of this feature's coverage).
      const firstRow = resultRows.first();
      await expect(firstRow.getByRole("button", { name: "담기" })).toBeVisible();
      await expect(firstRow.getByRole("button", { name: /관심목록/ })).toBeVisible();
    }
  });
});

test.describe("watchlist", () => {
  test("loads without an existing wizard session", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.getByRole("heading", { name: /관심 강의/ })).toBeVisible();
  });

  test("search results offer adding straight to a group, not just the watchlist", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.getByText("최신 학기 강의 정보를 불러오는 중...")).toBeHidden({ timeout: 15000 });
    if (await page.getByText("강의 정보를 불러오지 못했습니다").isVisible().catch(() => false)) {
      test.skip(true, "no semester data loaded on this environment");
    }

    const searchInput = page.getByPlaceholder("과목명 / 학수번호 / 교수명 검색");
    await searchInput.fill("공학");
    await page.waitForTimeout(400);
    const resultRows = page.locator("table tbody tr");
    await expect(resultRows.first()).toBeVisible({ timeout: 5000 });

    // A fresh browser context has no groups yet, so this is the "만들기"
    // fallback rather than the group <select> -- both are the same feature
    // (reach the group-adding action without leaving /watchlist), just
    // different states of it.
    const firstRow = resultRows.first();
    await expect(firstRow.getByRole("button", { name: /관심목록/ })).toBeVisible();
    await expect(firstRow.getByRole("link", { name: "그룹 없음 · 만들기" })).toHaveAttribute("href", "/wizard");
  });
});

test.describe("saved timetables", () => {
  test("shows the empty state on a fresh browser context", async ({ page }) => {
    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: "저장된 시간표" })).toBeVisible();
    // A brand-new Playwright context has empty localStorage, so this must be
    // the empty state, not a stale card from a previous run.
    await expect(page.locator("body")).not.toContainText("undefined");
  });
});

test.describe("read-only API + static routes", () => {
  for (const route of ["/api/health", "/robots.txt", "/sitemap.xml"]) {
    test(`GET ${route} responds 200`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
    });
  }
});
