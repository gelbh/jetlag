import {
  test,
  expect,
  openMapWithLocalSession,
  enablePlayerUxWorld,
} from "../fixtures";

test.describe("mobile tool dock screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
  });

  test("@smoke matches compact closed dock", async ({ page }) => {
    await expect(page.locator(".jl-map-bottom-chrome-host")).toHaveScreenshot(
      "tool-dock-compact-closed.png",
    );
  });

  test("matches draw menu open", async ({ page }) => {
    await page.getByRole("button", { name: "Draw on map" }).click();
    await expect(page.getByRole("menu", { name: "Draw on map" })).toHaveScreenshot(
      "tool-draw-menu-open.png",
    );
  });
});

test.describe("mobile tool dock screenshots — survey world", () => {
  test.beforeEach(async ({ page }) => {
    await enablePlayerUxWorld(page);
    await openMapWithLocalSession(page);
    await expect(page.locator('[data-player-ux-world="survey"]')).toBeVisible();
  });

  test("@smoke matches compact closed dock (survey)", async ({ page }) => {
    await expect(page.locator(".jl-map-bottom-chrome-host")).toHaveScreenshot(
      "tool-dock-compact-closed-survey.png",
    );
  });
});

test.describe("iPhone 14 Pro Max tool dock screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await openMapWithLocalSession(page);
  });

  test("matches compact dock screenshots at 430px", async ({ page }) => {
    await expect(page.locator(".jl-map-bottom-chrome-host")).toHaveScreenshot(
      "tool-dock-compact-14-pro-max.png",
    );
  });
});

test.describe("iPhone 13 PWA safe area screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMapWithLocalSession(page);
    await page.evaluate((safeBottomPx) => {
      document.documentElement.style.setProperty(
        "--safe-area-bottom",
        `${safeBottomPx}px`,
      );
    }, 34);
  });

  test("matches compact dock screenshot with safe area", async ({ page }) => {
    await expect(page.locator(".jl-map-bottom-chrome-host")).toHaveScreenshot(
      "tool-dock-compact-iphone13-safe-area.png",
    );
  });
});

test.describe("landscape survey chrome distill", () => {
  test.beforeEach(async ({ page }) => {
    await enablePlayerUxWorld(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await openMapWithLocalSession(page);
    await expect(page.locator('[data-player-ux-world="survey"]')).toBeVisible();
  });

  test("matches landscape chip / distilled chrome (survey)", async ({
    page,
  }) => {
    // Checklist: secondary session actions + map-controls hide when expanded under survey.
    await expect(page.locator('[data-player-ux-world="survey"]')).toBeVisible();
    await expect(page.locator(".jl-map-bottom-chrome-host")).toHaveScreenshot(
      "tool-dock-landscape-survey.png",
      { maxDiffPixelRatio: 0.03 },
    );
  });
});
