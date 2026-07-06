import { type Page, expect } from "@playwright/test";
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

async function waitForWizardNext(page: Page) {
  await expect(page.getByRole("button", { name: "Next" })).toBeEnabled({
    timeout: 15_000,
  });
}

async function dismissActiveToolPanel(page: Page) {
  const closeTool = page.getByRole("button", { name: /^Close / });
  if (await closeTool.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeTool.click({ timeout: 5_000 }).catch(() => undefined);
  }
}

export const PENDING_QUESTION_TEXT =
  /Are you within|closer to or further|hotter or colder|nearest to|same as my nearest/i;

export async function completeRadarSolo(page: Page) {
  await clickToolDockButton(page, "Radar");
  await advanceWizard(page);
  await clickMapCenter(page);
  await advanceWizard(page);
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Add radar question" }).click();
  await expectMapHasAnnotations(page);
}

export async function sendRadarToHiders(page: Page) {
  await clickToolDockButton(page, "Radar");
  await advanceWizard(page);
  await clickMapCenter(page);
  await advanceWizard(page);
  const sendButton = page.getByRole("button", { name: "Send to hiders" });
  await expect(sendButton).toBeVisible({ timeout: 15_000 });
  await sendButton.click();
  await dismissActiveToolPanel(page);
}

export async function completeMatchingSolo(page: Page) {
  await clickToolDockButton(page, "Matching");
  await page.locator("select.field-input").selectOption("museum");
  await advanceWizard(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Add match question" }).click();
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
}

export async function sendMatchingToHiders(page: Page) {
  await clickToolDockButton(page, "Matching");
  await page.locator("select.field-input").selectOption("museum");
  await advanceWizard(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  const sendButton = page.getByRole("button", { name: "Send to hiders" });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
  await sendButton.click();
  await dismissActiveToolPanel(page);
}

export async function completeMeasuringSolo(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await page.locator("select.field-input").selectOption("museum");
  await advanceWizard(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByRole("button", { name: "Closer" }).click();
  await page.getByRole("button", { name: "Add measure question" }).click();
  await expectMapHasAnnotations(page);
}

export async function sendMeasuringToHiders(page: Page) {
  await clickToolDockButton(page, "Measuring");
  await page.locator("select.field-input").selectOption("museum");
  await advanceWizard(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  const sendButton = page.getByRole("button", { name: "Send to hiders" });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
  await sendButton.click();
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
  await waitForWizardNext(page);
  await advanceWizard(page);
  const sendButton = page.getByRole("button", { name: "Send to hiders" });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
  await sendButton.click();
  await dismissActiveToolPanel(page);
}

export async function completeTentacleSolo(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await advanceWizard(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await page.getByText("City Museum").click();
  await page.getByRole("button", { name: "Add tentacle question" }).click();
  await dismissActiveToolPanel(page);
  await expectMapHasAnnotations(page);
}

export async function sendTentacleToHiders(page: Page) {
  await clickToolDockButton(page, "Tentacles");
  await advanceWizard(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  const sendButton = page.getByRole("button", { name: "Send to hiders" });
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });
  await sendButton.click();
  await dismissActiveToolPanel(page);
}

export async function placePin(page: Page, note = "Camp") {
  await selectDrawTool(page, "Pin");
  await clickMapCenter(page);
  await expect(page.getByText("Location pinned on the map.")).toBeVisible();
  await page.getByPlaceholder("Closer to the train station than us").fill(note);
  await page.getByRole("button", { name: "Add note" }).click();
  await expectMapHasAnnotations(page);
}

export async function drawZone(page: Page, label = "Search zone") {
  await selectDrawTool(page, "Zone");
  await clickMapAt(page, 0.35, 0.3);
  await clickMapAt(page, 0.65, 0.3);
  await clickMapAt(page, 0.5, 0.45);
  await expect(page.getByText(/Vertices:\s*3/i)).toBeVisible({ timeout: 10_000 });
  await page.getByPlaceholder("Optional zone label").fill(label);
  await page.getByRole("button", { name: "Close zone", exact: true }).click();
  await expectMapHasAnnotations(page);
}

export async function undoAnnotation(page: Page) {
  await page.getByRole("button", { name: "Undo last annotation" }).click();
}

export async function redoAnnotation(page: Page) {
  await page.getByRole("button", { name: "Redo last annotation" }).click();
}

export async function openSettings(page: Page) {
  const settingsButton = page.getByRole("button", { name: "Open settings" });
  if (await settingsButton.isVisible().catch(() => false)) {
    await settingsButton.click();
  } else {
    await page.getByRole("button", { name: "More tools" }).click();
    await page.getByRole("menuitem", { name: "Setup" }).click();
  }
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function openChat(page: Page) {
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

  await page.getByRole("button", { name: "More tools" }).click();
  await page.getByRole("menuitem", { name: "Chat" }).click();
}

export async function closePanel(page: Page) {
  await page.getByRole("button", { name: "Close", exact: true }).click();
}

export async function answerInChat(page: Page, label: string) {
  const answerButton = page.getByRole("button", { name: label });
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
  await expect(page.getByText(new RegExp(`Answered: ${answer}`, "i"))).toBeVisible({
    timeout: 20_000,
  });
}
