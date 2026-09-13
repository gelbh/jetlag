import type { Page } from "@playwright/test";

/**
 * Survey is the sole player UX world (Wave 6 flag kill).
 * Kept as no-ops so older specs that called enable/disable still compile.
 */
export async function enablePlayerUxWorld(_page: Page) {
  void _page;
}

export async function disablePlayerUxWorld(_page: Page) {
  void _page;
}
