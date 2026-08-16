import type { Page } from "@playwright/test";

/**
 * Survey is the sole player UX world (Wave 6 flag kill).
 * Kept as no-ops so older visual specs that called enable/disable still compile.
 */
export async function enablePlayerUxWorld(_page: Page) {
  /* no-op — Survey is always on */
}

export async function disablePlayerUxWorld(_page: Page) {
  /* no-op — Broadcast HUD dual path removed; Survey cannot be disabled in-app */
}
