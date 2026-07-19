import { expect, type Locator, type Page } from "@playwright/test";
import { seedUsernameProfileDocs } from "./firestore-seed";
import { prepareE2EPage } from "./page-init";

export const E2E_LAYOUT_USERNAME = "e2e_layout_user";

export const SOCIAL_LAYOUT_ROUTES = {
  "/leaderboard": {
    ready: (page: Page) =>
      page.getByRole("tablist", { name: "Leaderboard metric" }),
    viewportTarget: (page: Page) =>
      page.getByRole("tablist", { name: "Leaderboard metric" }),
  },
  "/friends": {
    ready: (page: Page) =>
      page.getByRole("textbox", { name: "Search username" }),
    viewportTarget: (page: Page) =>
      page.getByRole("textbox", { name: "Search username" }),
  },
  "/stats": {
    ready: (page: Page) => page.getByRole("tablist", { name: "Stats role" }),
    viewportTarget: (page: Page) =>
      page.getByRole("tablist", { name: "Stats role" }),
  },
} as const;

export type SocialLayoutPath = keyof typeof SOCIAL_LAYOUT_ROUTES;

export const SOCIAL_LAYOUT_PATHS = Object.keys(
  SOCIAL_LAYOUT_ROUTES,
) as SocialLayoutPath[];

export function socialRouteReadyLocator(
  page: Page,
  path: SocialLayoutPath,
): Locator {
  return SOCIAL_LAYOUT_ROUTES[path].ready(page);
}

export function socialRouteViewportLocator(
  page: Page,
  path: SocialLayoutPath,
): Locator {
  return SOCIAL_LAYOUT_ROUTES[path].viewportTarget(page);
}

export async function signInAndSeedUsernameProfile(
  page: Page,
  username: string = E2E_LAYOUT_USERNAME,
): Promise<void> {
  await page.waitForFunction(
    () => window.__JETLAG_E2E__?.signInPermanentUserForCapture != null,
  );
  const uid = await page.evaluate(async () => {
    const bridge = window.__JETLAG_E2E__;
    if (!bridge?.signInPermanentUserForCapture) {
      throw new Error("E2E bridge is not installed.");
    }
    return bridge.signInPermanentUserForCapture();
  });
  // Client SDK cannot write usernames/profile (Functions-only rules).
  await seedUsernameProfileDocs(uid, username);
}

async function waitForSocialRouteChrome(
  page: Page,
  path: SocialLayoutPath,
): Promise<void> {
  await expect(socialRouteReadyLocator(page, path)).toBeVisible({
    timeout: 15_000,
  });
}

/**
 * Settles a social route past RequireUsername.
 * Signs in + seeds on `/` first so the target route does not paint auth gates.
 */
export async function openSocialRoute(
  page: Page,
  path: SocialLayoutPath,
  username: string = E2E_LAYOUT_USERNAME,
): Promise<void> {
  await prepareE2EPage(page);
  await page.goto("/");
  await signInAndSeedUsernameProfile(page, username);
  await page.goto(path);
  await waitForSocialRouteChrome(page, path);
}
