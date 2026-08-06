import { type Page, expect } from "@playwright/test";

export async function waitForHidingZoneWizard(page: Page) {
  await expect(page.getByTestId("ask-hud-host")).toBeVisible({
    timeout: 15_000,
  });
  const methodGroup = page.getByRole("group", {
    name: "Hiding zone placement method",
  });
  const locationSearch = page.getByPlaceholder("Search stations…");
  await expect(methodGroup.or(locationSearch)).toBeVisible({
    timeout: 15_000,
  });
}

export async function searchStationsInArea(page: Page) {
  const searchButton = page.getByRole("button", {
    name: /Search stations in this area|Search this area/i,
  });
  await expect(searchButton).toBeVisible({ timeout: 15_000 });
  await expect(searchButton).toBeEnabled();
  await searchButton.click();
  await expect(page.getByText(/Loading stations/i)).toBeHidden({
    timeout: 30_000,
  });
}

export async function advanceHidingZoneWizardToLocation(page: Page) {
  const methodGroup = page.getByRole("group", {
    name: "Hiding zone placement method",
  });
  if (await methodGroup.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Station" }).click();
  }
  await expect(page.getByPlaceholder("Search stations…")).toBeVisible({
    timeout: 15_000,
  });
  await searchStationsInArea(page);
}

export async function openHidingZoneWizard(page: Page) {
  await page.getByRole("button", { name: /Set zone|Change zone/i }).click();
  await waitForHidingZoneWizard(page);
}

export async function selectTransitStation(page: Page, name: string | RegExp) {
  const station = page.getByRole("button", { name });
  if (!(await station.isVisible())) {
    await searchStationsInArea(page);
  }
  await expect(station).toBeVisible({ timeout: 10_000 });
  await station.click();
}

export async function confirmHidingZone(page: Page, _moveMode = false) {
  const confirm = page.getByTestId("ask-commit-strip").getByRole("button");
  await expect(confirm).toBeEnabled({ timeout: 10_000 });
  await expect(confirm).toHaveAttribute("data-armed", "true");
  await confirm.click();
  await expect(page.getByText(/PERMISSION_DENIED/i)).toBeHidden({
    timeout: 5_000,
  });
}

export async function confirmInitialHidingZoneAtStation(
  page: Page,
  stationName: string | RegExp,
) {
  await openHidingZoneWizard(page);
  await advanceHidingZoneWizardToLocation(page);
  await selectTransitStation(page, stationName);
  await confirmHidingZone(page);
  await expect(page.getByRole("button", { name: "Play move" })).toBeVisible({
    timeout: 15_000,
  });
}
