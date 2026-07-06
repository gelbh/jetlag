import { test, expect } from "./fixtures";
import { openMapWithLocalSession, openSettings } from "./fixtures";

test.describe("settings", () => {
  test("toggles satellite basemap and transit layer visibility", async ({
    page,
  }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);

    const settingsPanel = page.getByRole("tabpanel");
    await settingsPanel.getByRole("button", { name: "Satellite" }).click();
    await page.getByRole("tab", { name: "Layers" }).click();
    await settingsPanel.getByLabel("Transit").click();
    await page.getByRole("button", { name: "Close" }).click();

    await openSettings(page);
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
    await page.getByRole("button", { name: "Close" }).click();

    await openSettings(page);
    await page.getByRole("tab", { name: "Map" }).click();
    await expect(
      settingsPanel.getByRole("button", { name: "Metric (km)" }),
    ).toBeVisible();
  });

  test("shows session code in session tab", async ({ page }) => {
    await openMapWithLocalSession(page, { code: "TEST" });
    await openSettings(page);
    await page.getByRole("tab", { name: "Session" }).click();
    await expect(page.locator(".jl-stamp-code").first()).toHaveText("TEST");
  });

  test("toggles tool layer visibility", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await page.getByRole("tab", { name: "Layers" }).click();

    const settingsPanel = page.getByRole("tabpanel");
    const radarToggle = settingsPanel.getByLabel("Radar");
    await radarToggle.click();
    await page.getByRole("button", { name: "Close" }).click();

    await openSettings(page);
    await page.getByRole("tab", { name: "Layers" }).click();
    await expect(settingsPanel.getByLabel("Radar")).not.toBeChecked();
  });

  test("export map button is available in session settings", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await page.getByRole("tab", { name: "Session" }).click();
    await expect(page.getByRole("button", { name: "Export map" })).toBeVisible();
  });
});
