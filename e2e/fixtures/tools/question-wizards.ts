import { type Page, expect } from "@playwright/test";
import {
  installE2eGeolocationDriver,
  stepE2eGeolocation,
} from "../geolocation";
import {
  clickMapAt,
  clickToolDockButton,
  expectEliminationMaskVisible,
  expectMapHasAnnotations,
} from "../map";

/** Expand MapFloatingPanel peek (pin/zone). Ask HUD uses Drawer, not peek. */
export async function expandToolPanelIfPeeked(page: Page) {
  const expand = page.getByRole("button", { name: /Expand .+ panel/i });
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
  }
}

/**
 * Ask sheet body lives in a Mantine Drawer portal. The `ask-hud-host` mount is a
 * zero-box wrapper, so scope interactions to the open drawer sheet content.
 */
export function askHudSheet(page: Page) {
  return page
    .getByTestId("mantine-drawer-sheet")
    .filter({
      has: page.locator(
        "[data-testid$='-hud-body'], [data-testid='ask-chip-island'], [data-testid='ask-catalog-rail'], [data-testid='ask-commit-strip'], [data-testid='ask-mode-cue-ticker'], [data-testid='ask-walk-banner']",
      ),
    })
    .or(
      page.locator(".mantine-Drawer-content, [role='dialog']").filter({
        has: page.locator(
          "[data-testid$='-hud-body'], [data-testid='ask-chip-island'], [data-testid='ask-catalog-rail'], [data-testid='ask-commit-strip'], [data-testid='ask-mode-cue-ticker'], [data-testid='ask-walk-banner']",
        ),
      }),
    )
    .first();
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
  await expect(page.getByTestId("ask-hud-host")).toBeAttached({
    timeout: 15_000,
  });
  await expect(askHudSheet(page)).toBeVisible({ timeout: 15_000 });
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
export async function advanceWizard(page: Page) {
  void page;
  // Ask HUD mid-steps advance via map place, chip, or catalog row — not CONTINUE.
}

/** @deprecated Phase retreat retired for Ask HUD. */
export async function retreatWizard(page: Page) {
  void page;
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

/**
 * Ask HUD covers the lower map on mobile; geometric center clicks often miss.
 * Prefer mocked GPS ("Use my location") when AnchorControls / PlacementActions
 * is shown. Measuring/tentacle advance the chord after place (GPS control
 * unmounts); radar/matching keep "Location locked" in-panel.
 */
export async function placeAskAnchor(page: Page) {
  const gps = page.getByRole("button", { name: /Use my location/i });
  if (await gps.isVisible().catch(() => false)) {
    await gps.click();
    await expect
      .poll(
        async () => {
          const locked =
            (await page
              .getByText(
                /Location locked|pinned on the map|Anchor set|Anchor ·|Center pinned/i,
              )
              .count()) > 0;
          if (locked) return true;
          return (
            (await page.getByRole("button", { name: /Use my location/i }).count()) ===
            0
          );
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    return;
  }

  // Map-first / auto-center: placement chord may already show answers.
  await expect(
    page.getByRole("button", { name: /Yes|No|Change distance/i }).first(),
  ).toBeVisible({ timeout: 15_000 });
}

/** Map tap in the upper visible band above Ask HUD chrome (fallback / second pin). */
export async function clickMapAboveAskHud(page: Page, xRatio = 0.5) {
  // Stay in the upper-mid band — very top hits chrome; mid-map clears the HUD.
  await clickMapAt(page, xRatio, 0.32);
}

export async function waitForGeoLoadingIdle(page: Page) {
  const loadingPattern =
    /Finding nearest feature|Finding division|Finding landmass|Loading locations within/;
  const loading = page.getByText(loadingPattern);
  if (await loading.count()) {
    await expect(loading).toHaveCount(0, { timeout: 60_000 });
  }
}

/** Primed multiplayer send (AskCommitStrip or map-first "Send to hiders"). */
export const SEND_TO_HIDERS_BUTTON = /^(SEND · D\d+P\d+|Send to hiders)$/;

export async function expectSendToHidersInViewport(page: Page) {
  const sendButton = page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
}

async function waitForSendToHiders(page: Page) {
  await expectSendToHidersInViewport(page);
}

async function clickPrimedAsk(page: Page) {
  const strip = page.getByTestId("ask-commit-strip").getByRole("button");
  if (await strip.isVisible().catch(() => false)) {
    await waitForPrimedCommit(page);
    await strip.click();
  } else {
    // Radar/map-first chrome uses a plain Send button, not AskCommitStrip.
    const send = page.getByRole("button", {
      name: /^Send$|^ASK(?: ·|$)/,
    });
    await expect(send).toBeEnabled({ timeout: 60_000 });
    await send.click();
  }
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 30_000,
  });
}

export async function dismissActiveToolPanel(page: Page) {
  // Deselect tool / close map-first chrome. Escape twice covers stacked drawers.
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.keyboard.press("Escape").catch(() => undefined);
}

export const PENDING_QUESTION_TEXT =
  /Are you within|closer to or further|hotter or colder|nearest to|same as my nearest/i;

export async function selectFirstRadarDistance(page: Page) {
  // Prefer a mid-row preset — top chips can sit under AskCommitStrip on mobile.
  const preset = page.getByRole("button", { name: /^1 Mile$|^1\.6 km$/i });
  await expect(preset).toBeVisible({ timeout: 15_000 });
  await preset.scrollIntoViewIfNeeded();
  await preset.click();
  // Catalog-first swaps to place chord, or map-first keeps pressed chip + answers.
  await expect(
    page
      .getByRole("button", {
        name: /Use my location|Tap the map|Place at map tap|Yes|Change distance/i,
      })
      .first(),
  ).toBeVisible({ timeout: 15_000 });
}

export async function completeRadarSolo(page: Page) {
  await clickToolDockButton(page, "Radar");
  await expectAskHud(page);
  // Catalog-first: pick distance, then map/GPS placement chord.
  await selectFirstRadarDistance(page);
  await placeAskAnchor(page);
  await chooseAnswer(page, "Yes");
  await clickPrimedAsk(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendRadarToHiders(page: Page) {
  await clickToolDockButton(page, "Radar");
  await expectAskHud(page);
  await selectFirstRadarDistance(page);
  await placeAskAnchor(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await expect(page.getByTestId("radar-map-placement")).toBeHidden({
    timeout: 15_000,
  });
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
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
  await placeAskAnchor(page);
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
  await placeAskAnchor(page);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
}

export async function completeMeasuringSolo(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await expectAskHud(page);
  await placeAskAnchor(page);
  await pickCatalogRow(page, /Museum/i);
  await clickMapAboveAskHud(page, 0.72);
  await waitForGeoLoadingIdle(page);
  await expect(
    askHudSheet(page).getByText(/\d+(\.\d+)?\s*(mi|km|m)\b/i),
  ).toBeVisible({ timeout: 30_000 });
  await chooseAnswer(page, "Closer");
  await clickPrimedAsk(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendMeasuringToHiders(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await expectAskHud(page);
  await placeAskAnchor(page);
  await pickCatalogRow(page, /Museum|Transit|Park/i);
  await waitForGeoLoadingIdle(page);
  await clickMapAboveAskHud(page, 0.65);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
}

/**
 * Thermometer placement via GPS walk — Ask HUD blocks reliable MapLibre pin taps
 * under the chrome stack. In-page geolocation driver notifies watchers (CDP
 * override alone often leaves watchPosition quiet).
 */
async function placeThermometerGpsWalk(page: Page) {
  await installE2eGeolocationDriver(page);
  await clickToolDockButton(page, "Thermometer");
  await expectAskHud(page);
  const hud = askHudSheet(page);
  const gpsChip = hud.getByRole("button", { name: /^GPS track$/i });
  if ((await gpsChip.getAttribute("aria-pressed")) !== "true") {
    await gpsChip.click();
  }
  await hud.getByRole("button", { name: /^Start track$/i }).click();
  await expect(page.getByTestId("ask-walk-banner")).toBeVisible({
    timeout: 20_000,
  });

  // Step north past the default ½ mi thermometer distance (≈804 m).
  // Poll/throttle windows in useThermometerWalk are ~500–750ms.
  for (const lat of [53.355, 53.36, 53.365, 53.37]) {
    await stepE2eGeolocation(page, { latitude: lat, longitude: -6.26 });
    // eslint-disable-next-line playwright/no-wait-for-timeout -- cover ~500–750ms thermometer poll/throttle
    await page.waitForTimeout(1_100);
  }

  const endWalk = page
    .getByTestId("ask-commit-strip")
    .getByRole("button", { name: /^END WALK/i });
  // Auto-stop may already have finished the walk once travel ≥ target.
  if (await endWalk.isVisible().catch(() => false)) {
    await expect(endWalk).toBeEnabled({ timeout: 20_000 });
    await endWalk.click();
  }
  await expect(page.getByTestId("ask-walk-banner")).toBeHidden({
    timeout: 30_000,
  });
}

export async function completeThermometerSolo(page: Page) {
  await placeThermometerGpsWalk(page);
  await chooseAnswer(page, "Hotter");
  await clickPrimedAsk(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendThermometerToHiders(page: Page) {
  // GPS walk start submits the pending question; walk end publishes reply options.
  // There is no separate SEND · DnPm strip after a multiplayer thermometer walk.
  await placeThermometerGpsWalk(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 30_000,
  });
}

export async function completeTentacleSolo(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await expectAskHud(page);
  await pickCatalogRow(page, /Museum|Transit|Park/i);
  await placeAskAnchor(page);
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
  await placeAskAnchor(page);
  await waitForGeoLoadingIdle(page);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
}

export async function sendPhotoToHiders(page: Page) {
  await clickToolDockButton(page, "Photo");
  await expectAskHud(page);
  // Catalog-first: pick a photo ask, then primed send appears.
  await pickCatalogRow(page, /Tree|Park|You|The Sky/i);
  await waitForSendToHiders(page);
  await page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON }).click();
  await expect(page.getByTestId("photo-map-placement")).toBeHidden({
    timeout: 15_000,
  });
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
}
