import { type Page, expect } from "@playwright/test";
import {
  blockExternalAssets,
  type BlockExternalAssetsOptions,
} from "./network";

async function applyPageCaptureInit(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jetlag.mapFirstRunDismissed", "1");
    // Mobile projects use iPhone UA — dismiss install tip so onboarding stays stable.
    localStorage.setItem("jetlag:pwa-install-tip-dismissed", "1");
    // Prod preview shows AnalyticsConsentBanner when unset — keep CI e2e chrome stable.
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
  // Home waits on Firebase auth bootstrap (BootSplash "Starting…") before inset rows.
  await expect(page.getByText("Starting…")).toBeHidden({ timeout: 45_000 });
  // Wave home: InsetRow UnstyledButton+Link (accessible name = label text).
  await expect(
    page.getByRole("link", { name: "Create session" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("link", { name: "Join session" }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function dismissMapOnboarding(page: Page) {
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  }
}
