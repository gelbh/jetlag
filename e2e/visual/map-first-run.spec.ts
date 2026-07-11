import {
  test,
  expect,
  blockExternalAssets,
  seedLocalSession,
} from "../fixtures";

test.describe("map first-run screenshots", () => {
  test("matches onboarding sheet baseline", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("jetlag.mapFirstRunDismissed");
    });
    await blockExternalAssets(page);
    await seedLocalSession(page);
    await page.goto("/map");
    await page.getByRole("button", { name: "Radar" }).waitFor();

    await expect(page.getByRole("dialog", { name: "Map tools guide" })).toHaveScreenshot(
      "map-first-run.png",
    );
  });
});
