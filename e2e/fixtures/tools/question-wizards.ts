import { type Page, expect } from "@playwright/test";
import {
  clickMapAt,
  clickMapCenter,
  clickToolDockButton,
  expectMapHasAnnotations,
} from "../map";

export async function advanceWizard(page: Page) {
  const next = page.getByRole("button", { name: "Next" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
}

export async function waitForMapPlacementCrosshair(page: Page) {
  await expect(page.locator(".map-crosshair")).toBeVisible({
    timeout: 15_000,
  });
}

export async function waitForWizardNext(page: Page) {
  await expect(page.getByRole("button", { name: "Next" })).toBeEnabled({
    timeout: 60_000,
  });
}

export async function waitForGeoLoadingIdle(page: Page) {
  const loadingPattern =
    /Finding nearest feature|Finding division|Finding landmass|Loading locations within/;
  const loading = page.getByText(loadingPattern);
  if (await loading.count()) {
    await expect(loading).toHaveCount(0, { timeout: 60_000 });
  }
}

async function waitForSendToHiders(page: Page) {
  await expect(
    page.getByRole("button", { name: /^Send to hiders \(D\d+P\d+\)$/ }),
  ).toBeEnabled({
    timeout: 15_000,
  });
}

async function placeAnchorAndAdvance(page: Page) {
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
}

async function placeHeavyToolAnchorAndAdvance(page: Page) {
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
}

const SEND_TO_HIDERS_BUTTON = /^Send to hiders \(D\d+P\d+\)$/;

export async function dismissActiveToolPanel(page: Page) {
  const closeTool = page.getByRole("button", { name: /^Close / });
  if (await closeTool.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeTool.click({ timeout: 5_000 }).catch(() => undefined);
  }
}

export const PENDING_QUESTION_TEXT =
  /Are you within|closer to or further|hotter or colder|nearest to|same as my nearest/i;

async function selectFirstRadarDistance(page: Page) {
  const preset = page.getByRole("button", { name: /Mile|km/i }).first();
  await expect(preset).toBeVisible({ timeout: 15_000 });
  await preset.click();
}

export async function completeRadarSolo(page: Page) {
  await clickToolDockButton(page, "Radar");
  await placeAnchorAndAdvance(page);
  await selectFirstRadarDistance(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Add radar question" }).click();
  await expectMapHasAnnotations(page);
}

export async function sendRadarToHiders(page: Page) {
  await clickToolDockButton(page, "Radar");
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await selectFirstRadarDistance(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

export async function completeMatchingSolo(page: Page) {
  await clickToolDockButton(page, "Matching");
  await placeHeavyToolAnchorAndAdvance(page);
  await page.locator("select.field-input").selectOption("museum");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Add match question" }).click();
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
}

export async function sendMatchingToHiders(page: Page) {
  await clickToolDockButton(page, "Matching");
  await placeHeavyToolAnchorAndAdvance(page);
  await page.locator("select.field-input").selectOption("museum");
  await waitForGeoLoadingIdle(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

export async function completeMeasuringSolo(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await placeHeavyToolAnchorAndAdvance(page);
  await page.locator("select.field-input").selectOption("museum");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await clickMapAt(page, 0.6, 0.4);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByRole("button", { name: "Closer" }).click();
  await page.getByRole("button", { name: "Add measure question" }).click();
  await expectMapHasAnnotations(page);
}

export async function sendMeasuringToHiders(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await placeHeavyToolAnchorAndAdvance(page);
  await page.locator("select.field-input").selectOption("museum");
  await waitForGeoLoadingIdle(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await clickMapAt(page, 0.6, 0.4);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

export async function completeThermometerSolo(page: Page) {
  await clickToolDockButton(page, "Thermometer");
  await page.getByRole("button", { name: "Manual pins" }).click();
  await advanceWizard(page);
  await clickMapAt(page, 0.35, 0.5);
  await clickMapAt(page, 0.65, 0.5);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByRole("button", { name: "Hotter" }).click();
  await page.getByRole("button", { name: "Add thermometer" }).click();
  await expectMapHasAnnotations(page);
}

export async function sendThermometerToHiders(page: Page) {
  await clickToolDockButton(page, "Thermometer");
  await page.getByRole("button", { name: "Manual pins" }).click();
  await advanceWizard(page);
  await clickMapAt(page, 0.35, 0.5);
  await clickMapAt(page, 0.65, 0.5);
  const sendButton = page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
  await sendButton.click();
  await dismissActiveToolPanel(page);
}

async function selectTentacleCategory(page: Page, categoryId = "museum") {
  await page.locator("select.field-input").selectOption(categoryId);
}

export async function completeTentacleSolo(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await selectTentacleCategory(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByText("City Museum").click();
  await page.getByRole("button", { name: "Add tentacle question" }).click();
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
}

export async function sendTentacleToHiders(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await selectTentacleCategory(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

export async function sendPhotoToHiders(page: Page) {
  await clickToolDockButton(page, "Photo");
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}
