import { type Page, expect } from "@playwright/test";
import {
  clickMapAt,
  clickMapCenter,
  clickToolDockButton,
  expectEliminationMaskVisible,
  expectMapHasAnnotations,
} from "../map";

/** Expand a peeked tool panel so wizard chrome is interactable. */
export async function expandToolPanelIfPeeked(page: Page) {
  const expand = page.getByRole("button", { name: /Expand .+ panel/i });
  const peeked = await expand.isVisible({ timeout: 2_000 }).catch(() => false);
  if (!peeked) {
    return;
  }
  await expand.click();
  await expect(expand).toBeHidden({ timeout: 5_000 });
}

/** Phase rail + configure continuum fingerprint for advance/retreat assertions. */
export async function wizardNavFingerprint(page: Page): Promise<string> {
  const phase = page
    .getByRole("list", { name: "Wizard phases" })
    .locator('[role="listitem"][aria-current="step"]');
  const phaseLabel = (await phase.getAttribute("aria-label"))?.trim();
  if (!phaseLabel) {
    throw new Error("Wizard phase rail has no current phase");
  }

  const continuum = page.getByRole("list", { name: "Configure steps" });
  if (await continuum.isVisible().catch(() => false)) {
    const text = await continuum.innerText();
    const match = text.match(/(\d+) of \d+/);
    return `${phaseLabel}:${match?.[1] ?? "0"}`;
  }
  return `${phaseLabel}:0`;
}

/** Clicks Continue and verifies the click registered via phase/continuum change. */
export async function advanceWizard(page: Page) {
  await expandToolPanelIfPeeked(page);
  const before = await wizardNavFingerprint(page);
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
  await expect
    .poll(() => wizardNavFingerprint(page), { timeout: 15_000 })
    .not.toBe(before);
}

/** Clicks Previous step and verifies nav fingerprint changed. */
export async function retreatWizard(page: Page) {
  const before = await wizardNavFingerprint(page);
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect
    .poll(() => wizardNavFingerprint(page), { timeout: 15_000 })
    .not.toBe(before);
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
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({
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

export const SEND_TO_HIDERS_BUTTON = /^Send to hiders \(D\d+P\d+\)$/;

export async function expectSendToHidersInViewport(page: Page) {
  const sendButton = page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
  await expect(sendButton).toBeInViewport();
}

async function waitForSendToHiders(page: Page) {
  await expectSendToHidersInViewport(page);
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

export async function dismissActiveToolPanel(page: Page) {
  const closeTool = page.getByRole("button", { name: /^Close / });
  if (await closeTool.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeTool.click({ timeout: 5_000 }).catch(() => undefined);
  }
}

export const PENDING_QUESTION_TEXT =
  /Are you within|closer to or further|hotter or colder|nearest to|same as my nearest/i;

export async function selectFirstRadarDistance(page: Page) {
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
  await waitForWizardNext(page);
  await advanceWizard(page);
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
  await waitForWizardNext(page);
  await advanceWizard(page);
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
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

export async function completeThermometerSolo(page: Page) {
  await clickToolDockButton(page, "Thermometer");
  await page.getByRole("button", { name: "Manual pins" }).click();
  await clickMapAt(page, 0.35, 0.5);
  await clickMapAt(page, 0.65, 0.5);
  await waitForWizardNext(page);
  await advanceWizard(page);
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
  await clickMapAt(page, 0.35, 0.5);
  await clickMapAt(page, 0.65, 0.5);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
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
  await clickMapCenter(page);
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
  await waitForWizardNext(page);
  await advanceWizard(page);
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
