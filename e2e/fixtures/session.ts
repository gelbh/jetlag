import { type Browser, expect, type Page } from "@playwright/test";
import { toLocalStorageSeed } from "../../src/test/scenarios/adapters/toLocalStorageSeed";
import {
  LOCAL_STORAGE_SEED_KEYS,
  SESSION_STORAGE_SEED_KEYS,
} from "../../src/test/scenarios/seedStorage";
import { E2E_GEOLOCATION, MAP_CONTAINER_SELECTOR } from "./map";
import type { BlockExternalAssetsOptions } from "./network";
import { dismissMapOnboarding, prepareE2EPage } from "./page-init";

type PlayerRole = "seeker" | "hider";
type GameSize = "small" | "medium" | "large";

export interface LocalSessionSeedOptions {
  code?: string;
  myRole?: PlayerRole;
  gameSize?: GameSize;
  sessionId?: string;
  hidingPeriodMinutes?: number;
  memberRoles?: Record<string, PlayerRole>;
  network?: BlockExternalAssetsOptions;
}

export async function seedLocalSession(page: Page, options: LocalSessionSeedOptions = {}) {
  const { code, myRole, gameSize, sessionId, hidingPeriodMinutes, memberRoles } = options;
  const seed = toLocalStorageSeed("dublin-local-map", {
    code,
    myRole,
    gameSize,
    sessionId,
    hidingPeriodMinutes,
    memberRoles,
  });

  await page.addInitScript(
    ({ sessionBlob, mapBlob, annotationsBlob, clearTimer, localKeys, sessionKeys }) => {
      localStorage.setItem(localKeys[0], sessionBlob);
      localStorage.setItem(localKeys[1], mapBlob);
      localStorage.setItem(localKeys[2], annotationsBlob);
      if (clearTimer) {
        for (const key of sessionKeys) {
          sessionStorage.removeItem(key);
        }
      }
    },
    {
      ...seed,
      localKeys: [...LOCAL_STORAGE_SEED_KEYS],
      sessionKeys: [...SESSION_STORAGE_SEED_KEYS],
    },
  );
}

export async function openMapWithLocalSession(page: Page, options: LocalSessionSeedOptions = {}) {
  const { network, ...seedOptions } = options;
  await prepareE2EPage(page, network);
  await seedLocalSession(page, seedOptions);
  await page.goto("/map");
  // Portrait: Radar is in the dock. Landscape map-dominant: dock is collapsed,
  // so wait for the chrome chip instead.
  await Promise.race([
    page.getByRole("button", { name: "Radar" }).waitFor(),
    page.getByRole("button", { name: /Show map controls/i }).waitFor(),
  ]);
  await dismissMapOnboarding(page);
}

export async function expectCreatePageMapPreviewLoaded(page: Page) {
  const map = page.locator(MAP_CONTAINER_SELECTOR).first();
  await map.waitFor({ state: "visible", timeout: 10_000 });

  await expect.poll(async () => (await map.boundingBox())?.height ?? 0).toBeGreaterThan(200);

  await expect.poll(async () => page.locator(".maplibregl-canvas").count()).toBeGreaterThan(0);
}

export async function createSessionFromCreatePage(page: Page) {
  await page.goto("/create");
  await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
  await page.getByRole("button", { name: "Find place" }).click();
  await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
    timeout: 10_000,
  });
  await expectCreatePageMapPreviewLoaded(page);
  await page.getByRole("button", { name: "Confirm game area" }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Radar" })).toBeVisible({
    timeout: 15_000,
  });
  await dismissMapOnboarding(page);
}

export async function readSessionCode(page: Page): Promise<string> {
  const block = page.getByTestId("tool-status-block-mantine");
  const stamp = page.locator(".jl-stamp-code").first();
  await expect(block.or(stamp)).toBeVisible({ timeout: 15_000 });

  if ((await stamp.count()) > 0 && (await stamp.isVisible().catch(() => false))) {
    const codeText = await stamp.textContent();
    expect(codeText?.trim()).toMatch(/^[A-Z]{4}$/);
    return codeText?.trim() ?? "ABCD";
  }

  const codeText = await block.locator(".jl-view-transition-session-code").textContent();
  expect(codeText?.trim()).toMatch(/^[A-Z]{4}$/);
  return codeText?.trim() ?? "ABCD";
}

export async function joinAsRole(guestPage: Page, code: string, role: PlayerRole) {
  await guestPage.goto("/join");
  const roleName = role === "hider" ? "Hider" : "Seeker";
  // SegmentedControl radios are visually hidden; click the visible label.
  const side = guestPage.getByLabel("Player side");
  await expect(side).toBeVisible({ timeout: 15_000 });
  await side.getByText(roleName, { exact: true }).click();
  await guestPage.getByPlaceholder("ABCD").fill(code);
  await guestPage.getByRole("button", { name: "Join session" }).click();

  if (role === "hider") {
    await expect(
      guestPage.getByRole("button", { name: /Set zone|Change zone|Play move/i }),
    ).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(guestPage.getByRole("button", { name: "Radar" })).toBeVisible({
      timeout: 30_000,
    });
  }
  await dismissMapOnboarding(guestPage);
}

export async function createHostSession(page: Page) {
  await createSessionFromCreatePage(page);
  const code = await readSessionCode(page);
  return { code, page };
}

export async function createMultiplayerContexts(
  browser: Browser,
  network: BlockExternalAssetsOptions = {},
) {
  const contextOptions = {
    geolocation: E2E_GEOLOCATION,
    permissions: ["geolocation"],
  };
  const hostContext = await browser.newContext(contextOptions);
  const guestContext = await browser.newContext(contextOptions);
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await prepareE2EPage(hostPage, network);
  await prepareE2EPage(guestPage, network);

  return {
    hostPage,
    guestPage,
    hostContext,
    guestContext,
    async cleanup() {
      await hostContext.close();
      await guestContext.close();
    },
  };
}

export async function seedPersistedLocalSessionOnHome(
  page: Page,
  options: LocalSessionSeedOptions = {},
) {
  await prepareE2EPage(page);
  await seedLocalSession(page, options);
  await page.goto("/");
}
