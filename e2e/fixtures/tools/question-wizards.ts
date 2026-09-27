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

/** Wait until PrimedCommitStrip is armed, or map-first Send is enabled. */
export async function waitForPrimedCommit(page: Page) {
  const strip = page.getByTestId("ask-commit-strip").getByRole("button");
  const send = primedAskSendButton(page);
  // Poll either limb before choosing path (strip can mount a beat late).
  await expect(strip.or(send).first()).toBeVisible({ timeout: 60_000 });
  if (await strip.isVisible().catch(() => false)) {
    await expect(strip).toBeEnabled({ timeout: 60_000 });
    await expect(strip).toHaveAttribute("data-armed", "true");
    return;
  }
  await expect(send).toBeEnabled({ timeout: 60_000 });
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
  // Tentacle map-first: selection lives on POI pins (strip only mirrors status).
  const tentaclePin = page.locator(
    `[data-testid="tentacle-poi-pin"][aria-label="${name}"]`,
  );
  if ((await tentaclePin.count()) > 0) {
    await expect(tentaclePin.first()).toBeVisible({ timeout: 15_000 });
    await tentaclePin.first().evaluate((el) => {
      if (el instanceof HTMLElement) {
        el.click();
      }
    });
    await expect(tentaclePin.first()).toHaveAttribute("aria-pressed", "true");
    return;
  }

  const option = page
    .getByRole("list", { name: /Tentacle answers/i })
    .getByRole("button", { name, exact: true })
    .or(
      page
        .getByRole("group", { name: /answer/i })
        .getByRole("button", { name, exact: true }),
    )
    .or(page.getByRole("button", { name, exact: true }))
    .first();
  await expect(option).toBeEnabled({ timeout: 15_000 });
  await option.evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.click();
    }
  });
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
 * unmounts). Map-first multiplayer may already show Send with no Yes/No chord.
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
            (await page
              .getByRole("button", { name: /Use my location/i })
              .count()) === 0
          );
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    return;
  }

  // Already placed / map-first: answers, send, or locked copy.
  await expect(
    page
      .getByRole("button", {
        name: /Yes|No|Closer|Further|Hotter|Colder|Send to hiders|^SEND(?: ·|$)|^Send$/i,
      })
      .or(
        page.getByText(
          /Location locked|pinned on the map|Anchor set|Anchor ·|Center pinned/i,
        ),
      )
      .first(),
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

/** Tip send cost suffix (`D2P1`). Shared source for primed / multiplayer / in-flight. */
const SEND_COST = String.raw`D\d+P\d+`;

/**
 * Primed AskCommitStrip or plain map-first Send (solo commit).
 * Examples: `SEND · D2P1`, bare `SEND`, `Send`.
 */
export const PRIMED_ASK_SEND_BUTTON = new RegExp(
  `^(SEND(?: · ${SEND_COST})?|Send)$`,
);

/**
 * Multiplayer armed send labels:
 * - AskCommitStrip primed: `SEND · DnPm`
 * - Map-first chrome: `Send to hiders`
 * - Panel commit: `Send to hiders (DnPm)`
 */
export const SEND_TO_HIDERS_BUTTON = new RegExp(
  `^(SEND · ${SEND_COST}|Send to hiders(?: \\(${SEND_COST}\\))?)$`,
);

/**
 * Any tip ask commit control (primed strip, plain Send, or multiplayer hiders).
 * Use for "must not be armed" asserts.
 */
export const ASK_SEND_ARMED_BUTTON = new RegExp(
  `^(SEND(?: · ${SEND_COST})?|Send(?: to hiders(?: \\(${SEND_COST}\\))?)?)$`,
);

/** Armed multiplayer send + in-flight `Sending…` (wait-until-gone after click). */
export const SEND_TO_HIDERS_IN_FLIGHT_BUTTON = new RegExp(
  `^(SEND · ${SEND_COST}|Send to hiders(?: \\(${SEND_COST}\\))?|Sending…)$`,
);

export function primedAskSendButton(page: Page) {
  return page.getByRole("button", { name: PRIMED_ASK_SEND_BUTTON });
}

export function sendToHidersButton(page: Page) {
  return page.getByRole("button", { name: SEND_TO_HIDERS_BUTTON });
}

export async function expectSendToHidersInViewport(page: Page) {
  const send = sendToHidersButton(page);
  await expect(send).toBeEnabled({ timeout: 15_000 });
  await expect(send).toBeInViewport();
}

async function clickSendToHiders(page: Page) {
  const send = sendToHidersButton(page);
  await expect(send).toBeEnabled({ timeout: 15_000 });
  await send.scrollIntoViewIfNeeded();
  // Map-first chrome can sit under markers; DOM click avoids pointer interception.
  await send.evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.click();
    }
  });
  // While submitting, label becomes "Sending…" which would otherwise make the
  // primed-send locator match count 0 and spuriously pass toBeHidden.
  await expect(
    page.getByRole("button", { name: SEND_TO_HIDERS_IN_FLIGHT_BUTTON }),
  ).toHaveCount(0, { timeout: 30_000 });
}

async function clickPrimedAsk(page: Page) {
  const strip = page.getByTestId("ask-commit-strip").getByRole("button");
  const send = primedAskSendButton(page);
  await expect(strip.or(send).first()).toBeVisible({ timeout: 60_000 });
  if (await strip.isVisible().catch(() => false)) {
    await expect(strip).toBeEnabled({ timeout: 60_000 });
    await expect(strip).toHaveAttribute("data-armed", "true");
    await strip.click();
  } else {
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
  /Are you within|Within .+ of me|closer to or further|hotter or colder|nearest to|same as my nearest|Tentacle question|Matching question|Measuring question|Radar question|Thermometer question|Photo question/i;

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
  await expectSendToHidersInViewport(page);
  await clickSendToHiders(page);
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
  await expectSendToHidersInViewport(page);
  await clickSendToHiders(page);
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
}

export async function completeMeasuringSolo(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await expectAskHud(page);
  // Tip catalog-first: pick what to measure, then place / GPS.
  await pickCatalogRow(page, /Museum/i);
  await placeAskAnchor(page);
  await clickMapAboveAskHud(page, 0.72);
  await waitForGeoLoadingIdle(page);
  await expect(
    page.getByText(/\d+(\.\d+)?\s*(mi|km|m)\b/i).first(),
  ).toBeVisible({ timeout: 30_000 });
  await chooseAnswer(page, "Closer");
  await clickPrimedAsk(page);
  await expectMapHasAnnotations(page);
  await expectEliminationMaskVisible(page);
}

export async function sendMeasuringToHiders(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await expectAskHud(page);
  await pickCatalogRow(page, /Museum|Transit|Park/i);
  await placeAskAnchor(page);
  await waitForGeoLoadingIdle(page);
  await clickMapAboveAskHud(page, 0.65);
  await waitForGeoLoadingIdle(page);
  await expectSendToHidersInViewport(page);
  await clickSendToHiders(page);
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
}

/**
 * Thermometer placement via GPS walk. Tip map-first chrome owns GPS track /
 * Start track after a distance is armed (not the catalog drawer alone).
 */
async function placeThermometerGpsWalk(page: Page) {
  await installE2eGeolocationDriver(page);
  await clickToolDockButton(page, "Thermometer");
  await expectAskHud(page);

  const distance = page
    .getByRole("button", { name: /1\/2 mi|½ mi|0\.5 mi/i })
    .first();
  if (await distance.isVisible().catch(() => false)) {
    await distance.click();
  }

  const gpsChip = page.getByRole("button", { name: /^GPS track$/i });
  await expect(gpsChip).toBeVisible({ timeout: 20_000 });
  if ((await gpsChip.getAttribute("aria-pressed")) !== "true") {
    await gpsChip.click();
  }
  await page.getByRole("button", { name: /^Start track$/i }).click();
  const walkBanner = page.getByTestId("ask-walk-banner");
  await expect(walkBanner).toBeVisible({ timeout: 20_000 });

  // Step north past the default ½ mi target (≈804 m). useLiveLocation throttles
  // ~750ms between samples; wait that window between steps, then poll completion.
  for (const lat of [53.355, 53.36, 53.365, 53.37]) {
    const gatedAt = Date.now();
    await stepE2eGeolocation(page, { latitude: lat, longitude: -6.26 });
    await expect
      .poll(() => Date.now() - gatedAt, {
        timeout: 2_000,
        intervals: [200],
      })
      .toBeGreaterThanOrEqual(800);
    if (!(await walkBanner.isVisible().catch(() => false))) {
      break;
    }
  }

  const endWalk = page
    .getByTestId("ask-commit-strip")
    .getByRole("button", { name: /^END WALK/i })
    .or(page.getByRole("button", { name: /^END WALK/i }));
  // Auto-stop may already have finished once travel ≥ target.
  if (
    await endWalk
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await expect(endWalk.first()).toBeEnabled({ timeout: 20_000 });
    await endWalk.first().click();
  }
  await expect(walkBanner).toBeHidden({ timeout: 30_000 });
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

export async function sendPhotoToHiders(page: Page) {
  await clickToolDockButton(page, "Photo");
  await expectAskHud(page);
  // Catalog-first: pick a photo ask, then primed send appears.
  await pickCatalogRow(page, /Tree|Park|You|The Sky/i);
  await expectSendToHidersInViewport(page);
  await clickSendToHiders(page);
  await expect(page.getByTestId("photo-map-placement")).toBeHidden({
    timeout: 15_000,
  });
  await dismissActiveToolPanel(page);
  await expect(page.getByTestId("ask-hud-host")).toBeHidden({
    timeout: 15_000,
  });
}
