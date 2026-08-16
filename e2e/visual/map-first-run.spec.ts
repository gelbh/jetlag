import {
  test,
  expect,
  blockExternalAssets,
  seedLocalSession,
  enablePlayerUxWorld,
} from "../fixtures";

test.describe("map first-run screenshots", () => {
  test("@smoke matches onboarding sheet baseline", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("jetlag.mapFirstRunDismissed");
      localStorage.setItem("jl.analytics.consent", "denied");
      sessionStorage.setItem("jl.appCheckProbe.skip", "1");
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

test.describe("map first-run — survey world", () => {
  test("@smoke opens survey-skinned onboarding sheet under flag", async ({
    page,
  }) => {
    await enablePlayerUxWorld(page);
    await page.addInitScript(() => {
      localStorage.removeItem("jetlag.mapFirstRunDismissed");
      localStorage.setItem("jl.analytics.consent", "denied");
      sessionStorage.setItem("jl.appCheckProbe.skip", "1");
    });
    await blockExternalAssets(page);
    await seedLocalSession(page);
    await page.goto("/map");
    await page.getByRole("button", { name: "Radar" }).waitFor();

    const dialog = page.getByRole("dialog", { name: "Map tools guide" });
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-player-ux-world="survey"]')).toBeVisible();
  });
});
