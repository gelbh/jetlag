import { expect, type Locator, type Page } from "@playwright/test";

/** Status-rail sync beacon; its aria-label carries the short label ("Synced", "Offline", …). */
export function syncStatusChip(page: Page): Locator {
  // Segment placement puts role=status on the testid node; overlay/inline on a child.
  return page
    .locator(
      '[data-testid="sync-block-mantine"][role="status"], [data-testid="sync-block-mantine"] [role="status"]',
    )
    .first();
}

export async function readSyncStatusLabel(page: Page): Promise<string> {
  const chip = syncStatusChip(page);
  await expect(chip).toBeAttached({ timeout: 15_000 });
  return (await chip.getAttribute("aria-label")) ?? "";
}

/** Row-level "Waiting to send" marker for an un-acked write (after its 1 s delay). */
export function pendingSyncBadges(page: Page): Locator {
  return page.getByTestId("pending-sync-badge");
}

/**
 * Accept confirm() prompts (the action's own "are you sure"), but record any
 * alert(): offline-safe actions must never fall back to an error alert.
 */
export function trackAlertDialogs(page: Page): string[] {
  const alerts: string[] = [];
  page.on("dialog", (dialog) => {
    if (dialog.type() === "alert") {
      alerts.push(dialog.message());
      void dialog.dismiss();
      return;
    }
    void dialog.accept();
  });
  return alerts;
}

export async function readE2EUid(page: Page): Promise<string | null> {
  await page.waitForFunction(() => window.__JETLAG_E2E__ != null);
  return page.evaluate(() => window.__JETLAG_E2E__?.currentUid() ?? null);
}

/** Resolves once the PWA worker has installed (precache done) and controls this page. */
export async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller != null, undefined, {
    timeout: 30_000,
  });
}

/** Precached URLs (workbox precache) whose path matches `pattern`. */
export async function listPrecachedUrls(page: Page, pattern: RegExp): Promise<string[]> {
  const urls = await page.evaluate(async () => {
    const names = await caches.keys();
    const all: string[] = [];
    for (const name of names.filter((cacheName) => cacheName.includes("precache"))) {
      const cache = await caches.open(name);
      all.push(...(await cache.keys()).map((request) => request.url));
    }
    return all;
  });
  return urls.filter((url) => pattern.test(new URL(url).pathname));
}
