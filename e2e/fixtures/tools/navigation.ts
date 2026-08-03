import { type Locator, type Page, expect } from "@playwright/test";
import { clickViaEvaluate } from "../dom";

export async function clickSheetButton(sheet: Locator, name: string) {
  const button = sheet.getByRole("button", { name });
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();
  await clickViaEvaluate(button);
}

async function clickAnnotationHistoryButton(page: Page, name: string) {
  const dockButton = page.getByRole("button", { name });
  await expect(dockButton).toBeVisible();
  await dockButton.scrollIntoViewIfNeeded();
  await clickViaEvaluate(dockButton);
}

export async function undoAnnotation(page: Page) {
  await clickAnnotationHistoryButton(page, "Undo last annotation");
}

export async function redoAnnotation(page: Page) {
  await clickAnnotationHistoryButton(page, "Redo last annotation");
}

export async function expectRedoEnabled(page: Page) {
  await expect(
    page.getByRole("button", { name: "Redo last annotation" }),
  ).toBeEnabled();
}

export async function openSettings(page: Page) {
  const settings = page.getByRole("button", { name: "Open settings" });
  await expect(settings).toBeVisible();
  await settings.click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function closePanel(page: Page) {
  await page.getByRole("button", { name: "Close", exact: true }).click();
}
