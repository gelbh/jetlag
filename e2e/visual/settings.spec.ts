import {
  test,
  expect,
  openMapWithLocalSession,
  openSettings,
} from "../fixtures";

test.describe("settings panel screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
  });

  test("matches map tab baseline", async ({ page }) => {
    await expect(page.getByRole("dialog", { name: "Settings" })).toHaveScreenshot(
      "settings-map-tab.png",
    );
  });

  test("matches layers tab baseline", async ({ page }) => {
    await page.getByRole("tab", { name: "Layers" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toHaveScreenshot(
      "settings-layers-tab.png",
    );
  });

  test("matches session tab baseline", async ({ page }) => {
    await page.getByRole("tab", { name: "Session" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toHaveScreenshot(
      "settings-session-tab.png",
    );
  });
});
