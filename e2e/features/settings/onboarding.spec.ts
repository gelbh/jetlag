import {
  test,
  expect,
  blockExternalAssets,
  seedLocalSession,
  openSettings,
  closePanel,
} from "../../fixtures";

async function seedMapFirstRun(page: Parameters<typeof seedLocalSession>[0]) {
  await page.addInitScript(() => {
    localStorage.removeItem("jetlag.mapFirstRunDismissed");
    localStorage.setItem("jetlag:pwa-install-tip-dismissed", "1");
    localStorage.setItem("jl.analytics.consent", "denied");
    sessionStorage.setItem("jl.appCheckProbe.skip", "1");
  });
  await blockExternalAssets(page);
  await seedLocalSession(page);
  await page.goto("/map");
}

function mapToolsGuide(page: Parameters<typeof seedLocalSession>[0]) {
  return page.getByRole("dialog", { name: "Map tools guide" });
}

test.describe("onboarding", () => {
  test("map first-run sheet can be dismissed", async ({ page }) => {
    await seedMapFirstRun(page);

    const guide = mapToolsGuide(page);
    await expect(
      guide.getByRole("heading", { name: "Map tools", exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await guide.getByRole("button", { name: "Got it" }).click();
    await expect(guide).toBeHidden();
  });

  test("map tools guide reopens from settings after dismiss", async ({
    page,
  }) => {
    await seedMapFirstRun(page);

    const guide = mapToolsGuide(page);
    await expect(
      guide.getByRole("heading", { name: "Map tools", exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await guide.getByRole("button", { name: "Got it" }).click();
    await expect(guide).toBeHidden();

    await openSettings(page);
    await page.getByRole("tab", { name: "Session" }).click();
    await page.getByRole("button", { name: "Map tools guide" }).click();
    await expect(
      guide.getByRole("heading", { name: "Map tools", exact: true }),
    ).toBeVisible();
    await guide.getByRole("button", { name: "Done" }).click();
    await expect(guide).toBeHidden();
    await closePanel(page);
  });
});
