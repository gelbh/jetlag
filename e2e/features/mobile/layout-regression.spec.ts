import type { Page } from "@playwright/test";
import {
  test,
  expect,
  prepareE2EPage,
  openPlayHub,
  openMapWithLocalSession,
  openTutorialHub,
  openSocialRoute,
  assertNoHorizontalOverflow,
  assertInViewport,
  assertMinTapTargets,
  assertNoSeriousAxeViolations,
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

async function assertSocialLayoutSmoke(
  page: Page,
  path: "/leaderboard" | "/friends" | "/stats",
) {
  await openSocialRoute(page, path);
  await assertNoHorizontalOverflow(page);
  if (path === "/leaderboard") {
    await assertInViewport(page.getByTestId("leaderboard-filters"));
  } else if (path === "/friends") {
    await assertInViewport(
      page.getByRole("textbox", { name: "Search username" }),
    );
  } else {
    await assertInViewport(page.getByRole("tablist", { name: "Stats role" }));
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
    const more = page.getByRole("button", { name: "More tools" });
    await expect(more).toBeVisible();
    await assertMinTapTargets(more);
    const [box, viewport] = await Promise.all([
      more.boundingBox(),
      page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      })),
    ]);
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    // Leaflet markers trip aria-command-name; layout smoke is chrome-only
    await assertLayoutSmoke(page, { exclude: [".leaflet-container"] });
  });

  test("@smoke tutorial hub has no overflow", async ({ page }) => {
    await openTutorialHub(page);
    await assertLayoutSmoke(page);
  });

  test("@smoke leaderboard has no overflow and filters stay in viewport", async ({
    page,
  }) => {
    await assertSocialLayoutSmoke(page, "/leaderboard");
  });

  test("@smoke friends has no overflow and search stays in viewport", async ({
    page,
  }) => {
    await assertSocialLayoutSmoke(page, "/friends");
  });

  test("@smoke stats has no overflow and role tabs stay in viewport", async ({
    page,
  }) => {
    await assertSocialLayoutSmoke(page, "/stats");
  });
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

  test("@layout-deep leaderboard reflows at 320 without overflow", async ({
    page,
  }) => {
    await assertSocialLayoutSmoke(page, "/leaderboard");
  });

  test("@layout-deep friends reflows at 320 without overflow", async ({
    page,
  }) => {
    await assertSocialLayoutSmoke(page, "/friends");
  });

  test("@layout-deep stats reflows at 320 without overflow", async ({
    page,
  }) => {
    await assertSocialLayoutSmoke(page, "/stats");
  });
});
