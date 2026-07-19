import { expect, type Page } from "@playwright/test";
import { seedUsernameProfileDocs } from "./firestore-seed";
import { prepareE2EPage } from "./page-init";

export const E2E_LAYOUT_USERNAME = "e2e_layout_user";

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

async function waitForSocialRouteChrome(page: Page, path: string): Promise<void> {
  if (path.startsWith("/leaderboard")) {
    await expect(
      page.getByRole("tablist", { name: "Leaderboard metric" }),
    ).toBeVisible({ timeout: 15_000 });
    return;
  }

  if (path.startsWith("/friends")) {
    await expect(
      page.getByRole("textbox", { name: "Search username" }),
    ).toBeVisible({ timeout: 15_000 });
    return;
  }

  if (path.startsWith("/stats")) {
    await expect(page.getByRole("tablist", { name: "Stats role" })).toBeVisible({
      timeout: 15_000,
    });
    return;
  }

  throw new Error(`Unsupported social route: ${path}`);
}

export async function openSocialRoute(
  page: Page,
  path: "/leaderboard" | "/friends" | "/stats",
  username: string = E2E_LAYOUT_USERNAME,
): Promise<void> {
  await prepareE2EPage(page);
  await page.goto(path);
  await signInAndSeedUsernameProfile(page, username);
  await waitForSocialRouteChrome(page, path);
}
