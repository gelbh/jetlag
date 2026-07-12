import { test, expect, openMapWithLocalSession } from "../fixtures";

test.describe("mobile tool dock screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
  });

  test("@smoke matches compact closed dock", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveScreenshot(
      "tool-dock-compact-closed.png",
    );
  });

  test("matches overflow sheet open", async ({ page }) => {
    await page.getByRole("button", { name: "More tools" }).click();
    await expect(page.getByRole("dialog", { name: "More tools" })).toHaveScreenshot(
      "tool-overflow-sheet-open.png",
    );
  });
});

test.describe("iPhone 14 Pro Max tool dock screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await openMapWithLocalSession(page);
  });

  test("matches compact dock screenshots at 430px", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveScreenshot(
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
    await expect(page.locator(".jl-tool-dock-bar")).toHaveScreenshot(
      "tool-dock-compact-iphone13-safe-area.png",
    );
  });
});
