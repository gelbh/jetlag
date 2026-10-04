import { type Browser, expect, type Page } from "@playwright/test";
import { createTestSession } from "../../src/test/fixtures/sessions";
import { E2E_GEOLOCATION, MAP_CONTAINER_SELECTOR } from "./map";
import type { BlockExternalAssetsOptions } from "./network";
import { dismissMapOnboarding, prepareE2EPage } from "./page-init";

type PlayerRole = "seeker" | "hider";
type GameSize = "small" | "medium" | "large";

/** One-shot flag so reload keeps an advanced jetlag-timer (hiding-period smoke). */
const E2E_TIMER_CLEARED_KEY = "jetlag-e2e-timer-cleared";

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
  const {
    code,
    myRole = "seeker",
    gameSize,
    sessionId,
    hidingPeriodMinutes,
    memberRoles,
  } = options;
  const session = createTestSession({
    ...(sessionId !== undefined ? { id: sessionId } : {}),
    ...(code !== undefined ? { code } : {}),
    ...(gameSize !== undefined ? { gameSize } : {}),
    ...(hidingPeriodMinutes !== undefined ? { hidingPeriodMinutes } : {}),
    ...(memberRoles !== undefined ? { memberRoles } : {}),
  });
  const sessionBlob = JSON.stringify({
    state: { session, myRole, myUid: null },
    version: 0,
  });
  // Catalog seeded lowPowerMode; keep that one override, let mapStore fill the rest.
  const mapBlob = JSON.stringify({
    state: { lowPowerMode: true },
    version: 0,
  });

  await page.addInitScript(
    ({ sessionBlob: nextSession, mapBlob: nextMap, timerClearedKey }) => {
      localStorage.setItem("jetlag-session", nextSession);
      localStorage.setItem("jetlag-map", nextMap);
      localStorage.removeItem("jetlag-annotations");
      if (!sessionStorage.getItem(timerClearedKey)) {
        sessionStorage.removeItem("jetlag-timer");
        sessionStorage.setItem(timerClearedKey, "1");
      }
    },
    {
      sessionBlob,
      mapBlob,
      timerClearedKey: E2E_TIMER_CLEARED_KEY,
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

/** Jump to Create Rules (Create steps tab, else Next from Where). */
export async function goToCreateRulesStep(page: Page) {
  const rulesTab = page.getByRole("tablist", { name: "Create steps" }).getByRole("tab", {
    name: "Rules",
  });
  if (await rulesTab.isVisible().catch(() => false)) {
    await rulesTab.click();
  } else {
    await page.getByRole("button", { name: "Next" }).click();
  }

  await expect(page.getByRole("radiogroup", { name: "Game size" })).toBeVisible({
    timeout: 10_000,
  });
}

/** Advance Where → Rules → Play (or jump via Create steps Play tab). */
export async function goToCreatePlayStep(page: Page) {
  const createGame = page.getByRole("button", { name: "Create game" });
  if (await createGame.isVisible().catch(() => false)) {
    return;
  }

  const playTab = page.getByRole("tablist", { name: "Create steps" }).getByRole("tab", {
    name: "Play",
  });
  if (await playTab.isVisible().catch(() => false)) {
    await playTab.click();
  } else {
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
  }

  await expect(createGame).toBeVisible({ timeout: 10_000 });
}

export async function expectCreatePlaceSelected(page: Page, placeMatch = /Dublin/i) {
  await expect(page.getByPlaceholder("Dublin, Ireland")).toHaveValue(placeMatch, {
    timeout: 10_000,
  });
}

export async function createSessionFromCreatePage(page: Page) {
  await page.goto("/create");
  await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
  await page.getByRole("button", { name: "Find place" }).click();
  await expectCreatePlaceSelected(page);
  await expectCreatePageMapPreviewLoaded(page);
  await goToCreatePlayStep(page);
  await page.getByRole("button", { name: "Create game" }).click();
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
