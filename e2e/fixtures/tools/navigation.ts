import { expect, type Locator, type Page } from "@playwright/test";
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
  await expect(page.getByRole("button", { name: "Redo last annotation" })).toBeEnabled();
}

export async function openSettings(page: Page) {
  const settings = page.getByRole("button", { name: "Open settings" });
  await expect(settings).toBeVisible();
  await settings.scrollIntoViewIfNeeded();
  await clickViaEvaluate(settings);
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
}

export async function closePanel(page: Page) {
  const close = page.getByRole("button", { name: "Close", exact: true });
  const visible = await close.isVisible().catch(() => false);
  if (visible) {
    await close.click();
    await expect(close).toBeHidden({ timeout: 10_000 });
    return;
  }

  // Settings may be a Drawer (Escape) or rail (collapse). Prefer collapse when present.
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (await settings.isVisible().catch(() => false)) {
    const collapseRail = page.getByRole("button", {
      name: "Collapse map panels",
    });
    if ((await collapseRail.count()) > 0) {
      await expect(collapseRail).toBeVisible();
      await collapseRail.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(settings).toBeHidden({ timeout: 10_000 });
    return;
  }

  // Mobile chat has no Close; Escape dismisses.
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Chat tabs")).toBeHidden({ timeout: 10_000 });
}

async function confirmSettingsReset(
  page: Page,
  confirmButtonName: "Reset board for everyone" | "Reset session progress",
) {
  page.once("dialog", (dialog) => dialog.accept());
  await openSettings(page);
  await page.getByRole("tab", { name: "Session" }).click();
  await page.getByRole("button", { name: "Reset options" }).click();
  await page.getByRole("button", { name: confirmButtonName }).click();
}

export async function resetBoardForEveryone(page: Page) {
  await confirmSettingsReset(page, "Reset board for everyone");
}

export async function resetSessionProgress(page: Page) {
  await confirmSettingsReset(page, "Reset session progress");
}
