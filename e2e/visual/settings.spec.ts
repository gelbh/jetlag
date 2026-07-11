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
});
