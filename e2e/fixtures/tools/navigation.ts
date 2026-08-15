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
  await settings.scrollIntoViewIfNeeded();
  await clickViaEvaluate(settings);
  // Settings renders as a dialog with aria-label="Settings" (mobile/desktop)
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
}

export async function closePanel(page: Page) {
  const close = page.getByRole("button", { name: "Close", exact: true });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await expect(close).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
    return;
  }
  await page.keyboard.press("Escape").catch(() => undefined);
}
