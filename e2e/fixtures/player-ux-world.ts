import type { Page } from "@playwright/test";

/** Matches PLAYER_UX_WORLD_STORAGE_KEY in playerUxWorldFlag.ts */
const PLAYER_UX_WORLD_STORAGE_KEY = "jl.playerUxWorld";

/** Force Survey field-book chrome via localStorage override (before navigation). */
export async function enablePlayerUxWorld(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "on");
  }, PLAYER_UX_WORLD_STORAGE_KEY);
}

export async function disablePlayerUxWorld(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "off");
  }, PLAYER_UX_WORLD_STORAGE_KEY);
}
