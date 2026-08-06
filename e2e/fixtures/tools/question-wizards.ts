import { type Page, expect } from "@playwright/test";
import {
  clickMapAt,
  clickMapCenter,
  clickToolDockButton,
  expectEliminationMaskVisible,
  expectMapHasAnnotations,
} from "../map";

/** @deprecated Peek expand — Ask HUD has no floating peek panel. */
export async function expandToolPanelIfPeeked(
  _page: Page,
  _opts?: { timeoutMs?: number },
) {
  // no-op — AskHudHost is always map-visible
}

/** Cue ticker fingerprint (verb-only GlanceVerb). */
export async function askHudCueFingerprint(page: Page): Promise<string> {
  const cue = page.getByTestId("ask-mode-cue-ticker");
  await expect(cue).toBeVisible({ timeout: 15_000 });
  return (await cue.innerText()).trim();
}

/** @deprecated Prefer askHudCueFingerprint — phase rail retired for asks. */
export async function wizardNavFingerprint(page: Page): Promise<string> {
  return askHudCueFingerprint(page);
}

export async function expectAskHud(page: Page) {
  await expect(page.getByTestId("ask-hud-host")).toBeVisible({
    timeout: 15_000,
  });
}

/** Wait until PrimedCommitStrip is armed (terracotta / enabled). */
export async function waitForPrimedCommit(page: Page) {
  const strip = page.getByTestId("ask-commit-strip").getByRole("button");
  await expect(strip).toBeEnabled({ timeout: 60_000 });
  await expect(strip).toHaveAttribute("data-armed", "true");
}

/** @deprecated Continue retired — waits for primed strip instead. */
export async function waitForWizardNext(page: Page) {
  await waitForPrimedCommit(page);
}

/** @deprecated No CONTINUE — no-op when HUD advances via map/chips/rows. */
export async function advanceWizard(_page: Page) {
  // Ask HUD mid-steps advance via map place, chip, or catalog row — not CONTINUE.
}

/** @deprecated Phase retreat retired for Ask HUD. */
export async function retreatWizard(_page: Page) {
  // no-op
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

export async function waitForGeoLoadingIdle(page: Page) {
  const loadingPattern =
    /Finding nearest feature|Finding division|Finding landmass|Loading locations within/;
  const loading = page.getByText(loadingPattern);
  if (await loading.count()) {
    await expect(loading).toHaveCount(0, { timeout: 60_000 });
  }
}

/** Primed multiplayer send on AskCommitStrip. */
export const SEND_TO_HIDERS_BUTTON = /^SEND · D\d+P\d+$/;

export async function expectSendToHidersInViewport(page: Page) {
  const sendButton = page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
}

async function waitForSendToHiders(page: Page) {
  await expectSendToHidersInViewport(page);
}

async function clickPrimedAsk(page: Page) {
  await waitForPrimedCommit(page);
  const ask = page.getByRole("button", { name: /^ASK(?: ·|$)/ });
  await ask.click();
}

export async function dismissActiveToolPanel(page: Page) {
  // Deselect tool via Escape or dock — HUD has no Close panel chrome.
  await page.keyboard.press("Escape").catch(() => undefined);
}

export const PENDING_QUESTION_TEXT =
  /Are you within|closer to or further|hotter or colder|nearest to|same as my nearest/i;

export async function selectFirstRadarDistance(page: Page) {
  const preset = page.getByRole("button", { name: /Mile|km|0\.5|1 /i }).first();
  await expect(preset).toBeVisible({ timeout: 15_000 });
  await preset.click();
}

export async function completeRadarSolo(page: Page) {
  await clickToolDockButton(page, "Radar");
  await expectAskHud(page);
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await selectFirstRadarDistance(page);
  await chooseAnswer(page, "Yes");
  await clickPrimedAsk(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendRadarToHiders(page: Page) {
  await clickToolDockButton(page, "Radar");
  await expectAskHud(page);
  await clickMapCenter(page);
  await selectFirstRadarDistance(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

async function pickCatalogRow(page: Page, label: RegExp | string) {
  const row = page.getByRole("button", { name: label }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
}

export async function completeMatchingSolo(page: Page) {
  await clickToolDockButton(page, "Matching");
  await expectAskHud(page);
  await pickCatalogRow(page, /Museum/i);
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForGeoLoadingIdle(page);
  await chooseAnswer(page, "Yes");
  await clickPrimedAsk(page);
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendMatchingToHiders(page: Page) {
  await clickToolDockButton(page, "Matching");
  await expectAskHud(page);
  await pickCatalogRow(page, /Museum/i);
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

export async function completeMeasuringSolo(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await expectAskHud(page);
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await pickCatalogRow(page, /Museum|Transit|Park/i);
  await clickMapAt(page, 0.6, 0.4);
  await waitForGeoLoadingIdle(page);
  await chooseAnswer(page, "Closer");
  await clickPrimedAsk(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendMeasuringToHiders(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await expectAskHud(page);
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await pickCatalogRow(page, /Museum|Transit|Park/i);
  await waitForGeoLoadingIdle(page);
  await clickMapAt(page, 0.6, 0.4);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

async function placeThermometerManualPins(page: Page) {
  await clickToolDockButton(page, "Thermometer");
  await expectAskHud(page);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (el) => el.textContent?.trim() === "Manual pins",
    );
    if (!(btn instanceof HTMLButtonElement)) {
      throw new Error("Manual pins control not found");
    }
    btn.click();
  });
  await waitForMapPlacementCrosshair(page);
  await clickMapAt(page, 0.2, 0.5);
  await clickMapAt(page, 0.8, 0.5);
  await expect(
    page.getByText("Movement is shorter than the selected distance."),
  ).toHaveCount(0);
}

export async function completeThermometerSolo(page: Page) {
  await placeThermometerManualPins(page);
  await chooseAnswer(page, "Hotter");
  await clickPrimedAsk(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendThermometerToHiders(page: Page) {
  await placeThermometerManualPins(page);
  const sendButton = page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON });
  await expect(sendButton).toHaveCount(1);
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
  await sendButton.click();
  await dismissActiveToolPanel(page);
}

export async function completeTentacleSolo(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await expectAskHud(page);
  await pickCatalogRow(page, /Museum|Transit|Park/i);
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForGeoLoadingIdle(page);
  await chooseAnswer(page, "City Museum");
  await clickPrimedAsk(page);
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendTentacleToHiders(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await expectAskHud(page);
  await pickCatalogRow(page, /Museum|Transit|Park/i);
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}

export async function sendPhotoToHiders(page: Page) {
  await clickToolDockButton(page, "Photo");
  await expectAskHud(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
}
