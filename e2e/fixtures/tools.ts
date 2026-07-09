import { type Locator, type Page, expect } from "@playwright/test";
import {
  clickMapAt,
  clickMapCenter,
  clickToolDockButton,
  expectMapHasAnnotations,
  selectDrawTool,
} from "./base";

async function advanceWizard(page: Page) {
  const next = page.getByRole("button", { name: "Next" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
}

async function waitForMapPlacementCrosshair(page: Page) {
  await expect(page.locator(".map-crosshair")).toBeVisible({
    timeout: 15_000,
  });
}

async function waitForWizardNext(page: Page) {
  await expect(page.getByRole("button", { name: "Next" })).toBeEnabled({
    timeout: 60_000,
  });
}

async function waitForGeoLoadingIdle(page: Page) {
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

export async function placePin(page: Page, note = "Camp") {
  await dismissActiveToolPanel(page);
  await selectDrawTool(page, "Pin");
  await clickMapCenter(page);
  await expect(page.getByText("Location pinned on the map.")).toBeVisible();
  await page.getByPlaceholder("Closer to the train station than us").fill(note);
  await page.getByRole("button", { name: "Add note" }).click();
  await expectMapHasAnnotations(page);
}

export async function drawZone(page: Page, label = "Search zone") {
  await selectDrawTool(page, "Zone");
  // Stay near map center so taps remain inside the seeded game area on all viewports.
  await clickMapAt(page, 0.45, 0.45);
  await clickMapAt(page, 0.55, 0.45);
  await clickMapAt(page, 0.5, 0.52);
  await expect(page.getByText(/Vertices:\s*3/i)).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("Optional zone label").fill(label);
  await page.getByRole("button", { name: "Close zone", exact: true }).click();
  await expectMapHasAnnotations(page);
}

async function clickSheetButton(sheet: Locator, name: string) {
  const button = sheet.getByRole("button", { name });
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();
  await button.evaluate((element) => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
}

export async function clickOverflowToolButton(page: Page, name: string) {
  await page.getByRole("button", { name: "More tools" }).click();
  const sheet = page.getByRole("dialog", { name: "More tools" });
  await sheet.waitFor({ state: "visible" });
  await clickSheetButton(sheet, name);
}

async function clickAnnotationHistoryButton(page: Page, name: string) {
  const dockButton = page.getByRole("button", { name });
  if (await dockButton.isVisible().catch(() => false)) {
    await dockButton.scrollIntoViewIfNeeded();
    await dockButton.evaluate((element) => {
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    return;
  }

  await clickOverflowToolButton(page, name);
}

export async function undoAnnotation(page: Page) {
  await clickAnnotationHistoryButton(page, "Undo last annotation");
}

export async function redoAnnotation(page: Page) {
  await clickAnnotationHistoryButton(page, "Redo last annotation");
}

export async function expectRedoEnabled(page: Page) {
  const redoDock = page.getByRole("button", { name: "Redo last annotation" });
  if (await redoDock.isVisible().catch(() => false)) {
    await expect(redoDock).toBeEnabled();
    return;
  }

  await page.getByRole("button", { name: "More tools" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "More tools" })
      .getByRole("button", { name: "Redo last annotation" }),
  ).toBeEnabled();
}

export async function openSettings(page: Page) {
  const wideSetup = page
    .locator(".jl-tool-dock-wide-only")
    .getByRole("button", { name: "Open settings" });
  if (await wideSetup.isVisible().catch(() => false)) {
    await wideSetup.click();
  } else {
    await clickOverflowToolButton(page, "Open settings");
  }
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function openChat(page: Page) {
  const chatPanelClose = page.getByRole("button", { name: "Close", exact: true });
  if (await chatPanelClose.isVisible().catch(() => false)) {
    return;
  }

  await dismissActiveToolPanel(page);
  const dockChat = page.getByRole("button", { name: "Open chat" });
  if (await dockChat.isVisible().catch(() => false)) {
    await dockChat.click();
    return;
  }

  const chatTab = page.getByRole("button", { name: "Chat", exact: true });
  if (await chatTab.isVisible().catch(() => false)) {
    await chatTab.click();
    return;
  }

  await clickOverflowToolButton(page, "Open chat");
}

export async function closePanel(page: Page) {
  await page.getByRole("button", { name: "Close", exact: true }).click();
}

export async function answerInChat(page: Page, label: string) {
  const answerButton = page.getByRole("button", { name: `Send answer: ${label}` });
  if (!(await answerButton.isVisible().catch(() => false))) {
    await openChat(page);
  }
  await expect(answerButton).toBeVisible({ timeout: 20_000 });
  await answerButton.click();
}

export async function answerPhotoCannotInChat(page: Page) {
  const answerButton = page.getByRole("button", {
    name: "I cannot answer the question",
  });
  if (!(await answerButton.isVisible().catch(() => false))) {
    await openChat(page);
  }
  await expect(answerButton).toBeVisible({ timeout: 20_000 });
  await answerButton.click();
}

export async function answerYesInChat(page: Page) {
  await answerInChat(page, "Yes");
}

export async function expectChatAnswer(page: Page, answer: string) {
  const answered = page.getByText(new RegExp(`Answered: ${answer}`, "i"));
  if (!(await answered.isVisible().catch(() => false))) {
    await openChat(page);
  }
  await expect(answered).toBeVisible({
    timeout: 20_000,
  });
}

export async function waitForHidingZoneWizard(page: Page) {
  await expect(page.getByPlaceholder("Search stations…")).toBeVisible();
  await expect(page.getByText(/Loading stations/i)).toBeHidden({
    timeout: 30_000,
  });
}

export async function openHidingZoneWizard(page: Page) {
  await page.getByRole("button", { name: /Set hiding zone|Change hiding zone/i }).click();
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
  await selectTransitStation(page, stationName);
  await confirmHidingZone(page);
  await expect(page.getByRole("button", { name: "Play Move" })).toBeVisible({
    timeout: 15_000,
  });
}
