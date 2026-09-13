import type { Page } from "@playwright/test";

const KEY = "jl.playerUi.mantine";

export async function enablePlayerUiMantine(page: Page) {
  await page.addInitScript((storageKey) => {
    localStorage.setItem(storageKey, "1");
  }, KEY);
}

export async function disablePlayerUiMantine(page: Page) {
  await page.addInitScript((storageKey) => {
    localStorage.removeItem(storageKey);
  }, KEY);
}
