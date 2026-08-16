import type { Page } from "@playwright/test";
import {
  test,
  expect,
  prepareE2EPage,
  openPlayHub,
  openMapWithLocalSession,
  openSocialRoute,
  socialRouteViewportLocator,
  SOCIAL_LAYOUT_PATHS,
  type SocialLayoutPath,
  assertNoHorizontalOverflow,
  assertInViewport,
  assertMinTapTargets,
  assertNoSeriousAxeViolations,
  assertSurveyMapChromeAxe,
  assertSurveyEntryAxe,
  enablePlayerUxWorld,
  expectCreatePageMapPreviewLoaded,
} from "../../fixtures";

async function settleHome(page: Page) {
  await prepareE2EPage(page);
  await page.goto("/");
  await openPlayHub(page);
  await expect(page.getByRole("link", { name: "Join session" })).toBeVisible();
}

async function assertLayoutSmoke(
  page: Page,
  options?: { exclude?: string[] },
) {
  await assertNoHorizontalOverflow(page);
  await assertNoSeriousAxeViolations(page, options);
}

async function assertSocialLayoutSmoke(page: Page, path: SocialLayoutPath) {
  await openSocialRoute(page, path);
  await assertNoHorizontalOverflow(page);
  const viewportTarget = socialRouteViewportLocator(page, path);
  await assertInViewport(viewportTarget);
  if (path === "/friends") {
    await assertMinTapTargets(viewportTarget);
  } else if (path === "/stats") {
    await assertMinTapTargets(viewportTarget.getByRole("tab"));
  } else {
    // Scope tabs + Choose board chip (metric controls live in the board sheet).
    await assertMinTapTargets(viewportTarget.getByRole("tab"));
    await assertMinTapTargets(
      viewportTarget.getByRole("button", { name: /Choose board/i }),
    );
  }
  await assertNoSeriousAxeViolations(page);
}

test.describe("layout regression @ default mobile", () => {
  test("@smoke home has no overflow and meets tap targets", async ({
    page,
  }) => {
    await settleHome(page);
    await assertMinTapTargets(
      page.getByRole("link", { name: /Join session|Create session/i }),
    );
    await assertLayoutSmoke(page);
  });

  test("@smoke join has no overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/join");
    await expect(
      page.getByRole("heading", { name: "Session code" }),
    ).toBeVisible();
    await assertLayoutSmoke(page);
  });

  test("@smoke create HUD has no overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
    await page.getByRole("button", { name: "Find place" }).click();
    await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expectCreatePageMapPreviewLoaded(page);
    await assertLayoutSmoke(page);
  });

  test("@smoke map dock chrome stays in viewport", async ({ page }) => {
    await openMapWithLocalSession(page);
    const host = page.locator(".jl-map-bottom-chrome-host");
    const hunt = page.locator('[data-island="hunt"]');
    const session = page.locator('[data-island="session"]');
    await expect(host).toBeVisible();
    await expect(hunt).toBeVisible();
    await expect(session).toBeVisible();
    await expect(page.locator('[data-island="history-start"]')).toHaveCount(0);
    await expect(page.locator('[data-island="history-end"]')).toHaveCount(0);
    await expect(
      hunt.getByRole("button", { name: "Undo last annotation" }),
    ).toBeVisible();
    await expect(
      session.getByRole("button", { name: "Draw on map" }),
    ).toBeVisible();
    // All islands and their tool slots stay in viewport on mobile layouts.
    await assertInViewport(host);
    await assertInViewport(hunt);
    await assertInViewport(session);
    // Session island lives in the right-stack, not the bottom band.
    await expect(page.locator(".jl-map-chrome-bottom-band")).toHaveCount(1);
    await expect(page.locator(".jl-map-chrome-side-stack")).toHaveCount(1);
    await expect(
      page.locator(".jl-map-chrome-side-stack [data-island='session']"),
    ).toHaveCount(1);
    // Verify tap targets on session controls (side-stack slots: 2.75rem = 44px,
    // borders may measure slightly under, so allow 40px minimum).
    await assertMinTapTargets(
      session.getByRole("button", { name: "Open settings" }),
      40,
    );
    // Leaflet markers trip aria-command-name; layout smoke is chrome-only
    await assertLayoutSmoke(page, { exclude: [".maplibregl-map"] });
  });

  test("@smoke survey map chrome axe includes color-contrast", async ({
    page,
  }) => {
    await enablePlayerUxWorld(page);
    await openMapWithLocalSession(page);
    await expect(page.locator('[data-player-ux-world="survey"]')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertSurveyMapChromeAxe(page);
  });

  test("@smoke survey home axe includes color-contrast", async ({ page }) => {
    await enablePlayerUxWorld(page);
    await prepareE2EPage(page);
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Play — create, join, or custom game/i }),
    ).toBeVisible();
    await expect(page.locator('[data-player-ux-world="survey"]').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertSurveyEntryAxe(page);
  });

  for (const path of SOCIAL_LAYOUT_PATHS) {
    test(`@smoke ${path.slice(1)} has no overflow and chrome stays in viewport`, async ({
      page,
    }) => {
      await assertSocialLayoutSmoke(page, path);
    });
  }
});

test.describe("layout regression @ 320px", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("@smoke home reflows at 320 without overflow", async ({ page }) => {
    await settleHome(page);
    await assertLayoutSmoke(page);
  });

  test("@smoke join reflows at 320 without overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/join");
    await expect(
      page.getByRole("heading", { name: "Session code" }),
    ).toBeVisible();
    await assertLayoutSmoke(page);
  });
});

test.describe("layout regression social @ 320px", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  for (const path of SOCIAL_LAYOUT_PATHS) {
    test(`@layout-deep ${path.slice(1)} reflows at 320 without overflow`, async ({
      page,
    }) => {
      await assertSocialLayoutSmoke(page, path);
    });
  }
});
