import { type Locator, type Page, expect } from "@playwright/test";
import { clickViaEvaluate } from "../dom";

export async function clickSheetButton(sheet: Locator, name: string) {
  const button = sheet.getByRole("button", { name });
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();
  await clickViaEvaluate(button);
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
    await clickViaEvaluate(dockButton);
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
  const settings = page.getByRole("button", { name: "Open settings" });
  await expect(settings).toBeVisible();
  await settings.click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function closePanel(page: Page) {
  await page.getByRole("button", { name: "Close", exact: true }).click();
}
