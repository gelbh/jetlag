import type { Page } from "@playwright/test";
import {
  test,
  expect,
  prepareE2EPage,
  openPlayHub,
  openMapWithLocalSession,
  openTutorialHub,
  openSocialRoute,
  socialRouteViewportLocator,
  SOCIAL_LAYOUT_PATHS,
  type SocialLayoutPath,
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
    const more = page.getByRole("button", { name: "More tools" });
    await expect(more).toBeVisible();
    await assertMinTapTargets(more);
    await assertInViewport(more);
    // Leaflet markers trip aria-command-name; layout smoke is chrome-only
    await assertLayoutSmoke(page, { exclude: [".leaflet-container"] });
  });

  test("@smoke tutorial hub has no overflow", async ({ page }) => {
    await openTutorialHub(page);
    await assertLayoutSmoke(page);
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
