import { type Page, expect } from "@playwright/test";
import {
  blockExternalAssets,
  type BlockExternalAssetsOptions,
} from "./network";

async function applyPageCaptureInit(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jetlag.mapFirstRunDismissed", "1");
    localStorage.setItem("jetlag.mapToolsHintDismissed", "1");
    // Prod preview shows AnalyticsConsentBanner when unset — keep CI e2e/visual clean.
    localStorage.setItem("jl.analytics.consent", "denied");
    // App Check / reCAPTCHA is blocked by e2e network stubs — skip the probe gate.
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

export async function prepareE2EPage(
  page: Page,
  options: BlockExternalAssetsOptions = {},
) {
  await applyPageCaptureInit(page);
  await blockExternalAssets(page, options);
}

export async function openPlayHub(page: Page) {
  await page
    .getByRole("button", { name: /Play — create, join, or custom game/i })
    .click();
  await expect(page.getByRole("link", { name: "Create session" })).toBeVisible();
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
