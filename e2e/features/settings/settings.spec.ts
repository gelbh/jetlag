import {
  test,
  expect,
  openMapWithLocalSession,
  openSettings,
  closePanel,
} from "../../fixtures";

test.describe("settings", () => {
  test("toggles satellite basemap and transit layer visibility", async ({
    page,
  }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);

    const settingsPanel = page.getByRole("tabpanel");
    // Low power is inlined under Session (no Device & alerts drill-in).
    await page.getByRole("tab", { name: "Session" }).click();
    const lowPowerToggle = settingsPanel.getByLabel("Low power mode");
    await expect(lowPowerToggle).toBeChecked();
    await lowPowerToggle.click();
    await page.getByRole("tab", { name: "Map" }).click();
    await settingsPanel.getByRole("button", { name: "Satellite" }).click();
    // Layers live on Map (Annotation layers / Transit), not a separate tab.
    await settingsPanel.getByLabel("Transit").click();
    await closePanel(page);

    await openSettings(page);
    await page.getByRole("tab", { name: "Map" }).click();
    await expect(
      settingsPanel.getByRole("button", { name: "Satellite" }),
    ).toBeVisible();
  });

  test("switches distance units", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);

    const settingsPanel = page.getByRole("tabpanel");
    await page.getByRole("tab", { name: "Map" }).click();
    await settingsPanel.getByRole("button", { name: "Metric (km)" }).click();
    await closePanel(page);

    await openSettings(page);
    await page.getByRole("tab", { name: "Map" }).click();
    await expect(
      settingsPanel.getByRole("button", { name: "Metric (km)" }),
    ).toBeVisible();
  });

  test("shows session code in game tab", async ({ page }) => {
    await openMapWithLocalSession(page, { code: "TEST" });
    await openSettings(page);
    await page.getByRole("tab", { name: "Game" }).click();
    await expect(page.locator(".jl-stamp-code").first()).toHaveText("TEST");
  });

  test("toggles tool layer visibility", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await page.getByRole("tab", { name: "Map" }).click();

    const settingsPanel = page.getByRole("tabpanel");
    const radarToggle = settingsPanel.getByLabel("Radar");
    await radarToggle.click();
    await closePanel(page);

    await openSettings(page);
    await page.getByRole("tab", { name: "Map" }).click();
    await expect(settingsPanel.getByLabel("Radar")).not.toBeChecked();
  });

  test("export map button is available in session settings", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await page.getByRole("tab", { name: "Session" }).click();
    await expect(page.getByRole("button", { name: "Export map" })).toBeVisible();
  });
});
