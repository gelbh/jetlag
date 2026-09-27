/**
 * Ask HUD map-first Photo + Thermometer (and Matching sanity).
 */
import type { Page } from "@playwright/test";
import {
  test,
  expect,
  clickMapAtLatLng,
  clickToolDockButton,
  openMapWithLocalSession,
} from "../../fixtures";

async function pickRow(page: Page, label: RegExp) {
  const row = page.getByRole("button", { name: label }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
}

test.describe("ask map-first smoke", () => {
  test("Matching map-first after category", async ({ page }) => {
    await openMapWithLocalSession(page);

    await test.step("pick category; map placement chrome owns the ask", async () => {
      await clickToolDockButton(page, "Matching");
      await expect(page.getByTestId("matching-hud-body")).toBeVisible();
      await expect(page.getByTestId("ask-mode-cue-ticker")).toHaveCount(0);

      await pickRow(page, /Airport|Museum|Park|Transit/i);

      await expect(page.getByTestId("matching-map-placement")).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId("ask-hud-host")).toHaveCount(0);
      // Ask-first empties MapBottomChrome (min-h-0); attribute marks the mode.
      await expect(
        page.locator('[data-overlay-chrome][data-ask-first="true"]'),
      ).toHaveCount(1);
    });
  });

  test("Photo map-first after category (with hider)", async ({ page }) => {
    await openMapWithLocalSession(page, {
      memberRoles: { seeker: "seeker", hider: "hider" },
    });

    await test.step("pick photo ask; map-first send is visible", async () => {
      await clickToolDockButton(page, "Photo");
      await expect(page.getByTestId("photo-hud-body")).toBeVisible();
      await expect(page.getByTestId("ask-mode-cue-ticker")).toHaveCount(0);

      const chipOrRow = page
        .getByTestId("photo-hud-body")
        .getByRole("button")
        .first();
      await expect(chipOrRow).toBeVisible({ timeout: 10_000 });
      await chipOrRow.click();

      await expect(page.getByTestId("photo-map-placement")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByTestId("ask-hud-host")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Send to hiders/i }),
      ).toBeVisible();
    });
  });

  test("Thermometer map-first after distance pick", async ({ page }) => {
    await openMapWithLocalSession(page);

    await test.step("pick distance then place manual pins", async () => {
      await clickToolDockButton(page, "Thermometer");
      await expect(page.getByTestId("thermometer-hud-body")).toBeVisible();

      const sheet = page.getByRole("dialog", { name: "Thermometer" });
      await sheet.getByRole("button", { name: /1\/2 mi/i }).click();

      await expect(page.getByTestId("thermometer-map-placement")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByTestId("ask-hud-host")).toHaveCount(0);

      await page.getByRole("button", { name: /^Manual pins$/i }).click();
      await expect(page.getByText(/Tap the map for the start/i)).toBeVisible();
      await clickMapAtLatLng(page, 53.35, -6.26);
      await expect(page.getByText(/Tap the map for the end/i)).toBeVisible({
        timeout: 10_000,
      });
      await clickMapAtLatLng(page, 53.36, -6.25);

      await expect(
        page.getByTestId("thermometer-map-placement-choices"),
      ).toBeVisible({ timeout: 15_000 });
    });
  });
});
