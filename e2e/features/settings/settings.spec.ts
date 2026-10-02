import {
  clickViaEvaluate,
  closePanel,
  expect,
  openMapWithLocalSession,
  openSettings,
  test,
} from "../../fixtures";

test.describe("settings", () => {
  test("toggles satellite basemap and transit layer visibility", async ({ page }) => {
    await openMapWithLocalSession(page);

    await test.step("clear low power so satellite is available", async () => {
      await openSettings(page);
      await page.getByRole("tab", { name: "Session" }).click();
      const lowPowerToggle = page.getByRole("tabpanel").getByLabel("Low power mode");
      await expect(lowPowerToggle).toBeChecked();
      // Mantine Switch track intercepts Playwright pointer clicks on the input.
      await clickViaEvaluate(lowPowerToggle);
      await expect(lowPowerToggle).not.toBeChecked();
    });

    await test.step("set satellite and hide transit layer on Map", async () => {
      await page.getByRole("tab", { name: "Map" }).click();
      const settingsPanel = page.getByRole("tabpanel");
      await settingsPanel
        .getByRole("group", { name: "Map style" })
        .getByRole("button", { name: "Satellite" })
        .click();
      // Annotation-layers Transit (not Transit overlay under the Transit section).
      const transitLayer = settingsPanel.getByLabel("Transit", { exact: true });
      await expect(transitLayer).toBeChecked();
      await clickViaEvaluate(transitLayer);
      await closePanel(page);
    });

    await test.step("basemap and transit layer persist", async () => {
      await openSettings(page);
      await page.getByRole("tab", { name: "Map" }).click();
      const settingsPanel = page.getByRole("tabpanel");
      await expect(
        settingsPanel
          .getByRole("group", { name: "Map style" })
          .getByRole("button", { name: "Satellite" }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(settingsPanel.getByLabel("Transit", { exact: true })).not.toBeChecked();
      await closePanel(page);
    });
  });

  test("switches distance units", async ({ page }) => {
    await openMapWithLocalSession(page);

    await test.step("choose metric on Map", async () => {
      await openSettings(page);
      await page.getByRole("tab", { name: "Map" }).click();
      await page
        .getByRole("tabpanel")
        .getByRole("group", { name: "Distance unit" })
        .getByRole("button", { name: "Metric (km)" })
        .click();
      await closePanel(page);
    });

    await test.step("metric persists", async () => {
      await openSettings(page);
      await page.getByRole("tab", { name: "Map" }).click();
      await expect(
        page
          .getByRole("tabpanel")
          .getByRole("group", { name: "Distance unit" })
          .getByRole("button", { name: "Metric (km)" }),
      ).toHaveAttribute("aria-pressed", "true");
      await closePanel(page);
    });
  });

  test("shows session code on Game tab", async ({ page }) => {
    await openMapWithLocalSession(page, { code: "TEST" });
    await openSettings(page);
    await page.getByRole("tab", { name: "Game" }).click();
    await expect(page.getByRole("button", { name: "Copy session code TEST" })).toBeVisible();
    await closePanel(page);
  });

  test("toggles tool layer visibility", async ({ page }) => {
    await openMapWithLocalSession(page);

    await test.step("hide radar layer on Map", async () => {
      await openSettings(page);
      await page.getByRole("tab", { name: "Map" }).click();
      const radarToggle = page.getByRole("tabpanel").getByLabel("Radar");
      await clickViaEvaluate(radarToggle);
      await closePanel(page);
    });

    await test.step("radar stays unchecked", async () => {
      await openSettings(page);
      await page.getByRole("tab", { name: "Map" }).click();
      await expect(page.getByRole("tabpanel").getByLabel("Radar")).not.toBeChecked();
      await closePanel(page);
    });
  });

  test("export map button is available in session settings", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await page.getByRole("tab", { name: "Session" }).click();
    await expect(page.getByRole("button", { name: "Export map" })).toBeVisible();
    await closePanel(page);
  });
});
