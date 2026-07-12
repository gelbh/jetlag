import { type Page, expect } from "@playwright/test";
import {
  clickMapAt,
  clickMapCenter,
  clickToolDockButton,
  expectEliminationMaskVisible,
  expectMapHasAnnotations,
} from "../map";

/** Reads "N of M" from the wizard stepper; throws while no counter is rendered. */
export async function currentWizardStep(page: Page): Promise<number> {
  const stepper = page.getByRole("list", { name: "Progress" }).first();
  const text = await stepper.innerText();
  const match = text.match(/(\d+) of \d+/);
  if (!match) {
    throw new Error(`Wizard stepper has no step counter: "${text}"`);
  }
  return Number(match[1]);
}

/** Clicks Next and verifies the click registered by watching the step counter. */
export async function advanceWizard(page: Page) {
  const before = await currentWizardStep(page);
  const next = page.getByRole("button", { name: "Next" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
  await expect
    .poll(() => currentWizardStep(page), { timeout: 15_000 })
    .toBe(before + 1);
}

/** Clicks Previous step and verifies the step counter decremented. */
export async function retreatWizard(page: Page) {
  const before = await currentWizardStep(page);
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect
    .poll(() => currentWizardStep(page), { timeout: 15_000 })
    .toBe(before - 1);
}

/** Clicks an answer option and verifies the tap registered (aria-pressed). */
export async function chooseAnswer(page: Page, name: string) {
  const option = page.getByRole("button", { name, exact: true });
  await expect(option).toBeEnabled({ timeout: 15_000 });
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
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
  await chooseAnswer(page, "Yes");
  await page.getByRole("button", { name: "Add radar question" }).click();
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
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
  await chooseAnswer(page, "Yes");
  await page.getByRole("button", { name: "Add match question" }).click();
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
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
  await chooseAnswer(page, "Closer");
  await page.getByRole("button", { name: "Add measure question" }).click();
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
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
  await chooseAnswer(page, "Hotter");
  await page.getByRole("button", { name: "Add thermometer" }).click();
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
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

async function placeTentacleAnchor(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await waitForMapPlacementCrosshair(page);
  await page.getByRole("button", { name: "Use my location" }).click();
  await waitForWizardNext(page);
}

export async function completeTentacleSolo(page: Page) {
  await placeTentacleAnchor(page);
  await advanceWizard(page);
  await selectTentacleCategory(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await chooseAnswer(page, "City Museum");
  await page.getByRole("button", { name: "Add tentacle question" }).click();
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendTentacleToHiders(page: Page) {
  await placeTentacleAnchor(page);
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
