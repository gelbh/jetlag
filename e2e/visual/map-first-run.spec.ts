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

    // Radix modal hideOthers aria-hides the dock while the sheet is open —
    // wait for the guide, not Hunt tools.
    const guide = page.getByRole("dialog", { name: "Map tools guide" });
    await expect(guide).toBeVisible();
    await expect(guide).toHaveScreenshot("map-first-run.png");
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

    await expect(page.getByRole("button", { name: "Got it" })).toBeVisible();
    await expect(
      page.locator('[data-player-ux-world="survey"]').first(),
    ).toBeAttached();
  });
});
