import { expect, type Page } from "@playwright/test";
import { type BlockExternalAssetsOptions, blockExternalAssets } from "./network";

async function applyPageCaptureInit(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jetlag.mapFirstRunDismissed", "1");
    localStorage.setItem("jetlag.mapToolsHintDismissed", "1");
    // Mobile projects use iPhone UA: dismiss install tip so onboarding stays stable.
    localStorage.setItem("jetlag:pwa-install-tip-dismissed", "1");
    // Prod preview shows AnalyticsConsentBanner when unset: keep CI e2e chrome stable.
    localStorage.setItem("jl.analytics.consent", "denied");
    // App Check / reCAPTCHA is blocked by e2e network stubs: skip the probe gate.
    sessionStorage.setItem("jl.appCheckProbe.skip", "1");
    try {
      indexedDB.deleteDatabase("jetlag-geographic-cache");
    } catch {
      // IndexedDB may be unavailable in some contexts.
    }

    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query.includes("prefers-reduced-motion")) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        } as MediaQueryList;
      }
      return matchMedia(query);
    };
  });
}

export async function prepareE2EPage(page: Page, options: BlockExternalAssetsOptions = {}) {
  await applyPageCaptureInit(page);
  await blockExternalAssets(page, options);
}

export async function openPlayHub(page: Page) {
  // Current home shows Play links inline. Auth bootstrap can leave BootSplash up
  // briefly; wait for the links rather than a one-shot isVisible() that races.
  const create = page.getByRole("link", { name: "Create session" });
  const join = page.getByRole("link", { name: "Join session" });
  await expect(create).toBeVisible({ timeout: 30_000 });
  await expect(join).toBeVisible();
}

export async function dismissMapOnboarding(page: Page) {
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  }
  const toolsHint = page.getByText(/Question tools are on the bottom bar/i);
  if (await toolsHint.isVisible().catch(() => false)) {
    const closeHint = page.getByRole("button", { name: "Close" });
    if (await closeHint.isVisible().catch(() => false)) {
      await closeHint.click();
    }
  }
}
