import { type Page, expect } from "@playwright/test";

export async function waitForHidingZoneWizard(page: Page) {
  const methodStep = page
    .getByRole("tablist", { name: "Hiding zone placement method" })
    .or(page.getByRole("group", { name: "Hiding zone placement method" }));
  const locationSearch = page.getByPlaceholder("Search stations…");
  await expect(methodStep.or(locationSearch)).toBeVisible({ timeout: 15_000 });
}

export async function advanceHidingZoneWizardToLocation(page: Page) {
  const methodTablist = page.getByRole("tablist", {
    name: "Hiding zone placement method",
  });
  const methodGroup = page.getByRole("group", {
    name: "Hiding zone placement method",
  });
  if (await methodTablist.isVisible()) {
    await page.getByRole("tab", { name: "Station" }).click();
  } else if (await methodGroup.isVisible()) {
    await page.getByRole("button", { name: "Station" }).click();
  }
  await expect(page.getByPlaceholder("Search stations…")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Loading stations/i)).toBeHidden({
    timeout: 30_000,
  });
}

export async function openHidingZoneWizard(page: Page) {
  await page.getByRole("button", { name: /Set zone|Change zone/i }).click();
  await waitForHidingZoneWizard(page);
}

export async function selectTransitStation(page: Page, name: string | RegExp) {
  const station = page.getByRole("button", { name });
  await expect(station).toBeVisible({ timeout: 10_000 });
  await station.click();
}

export async function confirmHidingZone(page: Page, moveMode = false) {
  const label = moveMode ? "Confirm new zone" : "Confirm hiding zone";
  const confirm = page.getByRole("button", { name: label });
  await expect(confirm).toBeEnabled({ timeout: 10_000 });
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
  await page.getByRole("button", { name: "Next" }).click();
  await confirmHidingZone(page);
  await expect(page.getByRole("button", { name: "Play move" })).toBeVisible({
    timeout: 15_000,
  });
}
