import { type Browser, type Page, expect } from "@playwright/test";
import { LOCAL_GAME_AREA, prepareE2EPage } from "./base";

type PlayerRole = "seeker" | "hider";
type GameSize = "small" | "medium" | "large";

export interface LocalSessionSeedOptions {
  code?: string;
  myRole?: PlayerRole;
  gameSize?: GameSize;
  sessionId?: string;
}

export async function seedLocalSession(
  page: Page,
  options: LocalSessionSeedOptions = {},
) {
  const {
    code = "TEST",
    myRole = "seeker",
    gameSize = "medium",
    sessionId = "local",
  } = options;

  await page.addInitScript(
    ({ sessionState, role }) => {
      localStorage.setItem(
        "jetlag-session",
        JSON.stringify({
          state: {
            session: sessionState,
            myRole: role,
            myUid: null,
          },
          version: 0,
        }),
      );
      localStorage.setItem(
        "jetlag-map",
        JSON.stringify({
          state: {
            keepScreenAwake: false,
            distanceUnit: "imperial",
            mapStyle: "standard",
            layerVisibility: {
              radar: true,
              thermometer: true,
              measuring: true,
              matching: true,
              zone: true,
              pin: true,
              tentacle: true,
              transit: true,
            },
          },
          version: 0,
        }),
      );
    },
    {
      sessionState: {
        id: sessionId,
        code,
        gameArea: LOCAL_GAME_AREA,
        createdAt: "2026-01-01T00:00:00.000Z",
        memberUids: [],
        tier: "free",
        gameSize,
      },
      role: myRole,
    },
  );
}

export async function openMapWithLocalSession(
  page: Page,
  options: LocalSessionSeedOptions = {},
) {
  await prepareE2EPage(page);
  await seedLocalSession(page, options);
  await page.goto("/map");
  await page.getByRole("button", { name: "Radar" }).waitFor();
}

export async function createSessionFromCreatePage(page: Page) {
  await page.goto("/create");
  await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
  await page.getByRole("button", { name: "Find place" }).click();
  await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Confirm game area" }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Radar" })).toBeVisible({
    timeout: 15_000,
  });
}

export async function readSessionCode(page: Page): Promise<string> {
  const codeText = await page.locator(".jl-stamp-code").textContent();
  expect(codeText).toMatch(/^[A-Z]{4}$/);
  return codeText ?? "ABCD";
}

export async function joinAsRole(
  guestPage: Page,
  code: string,
  role: PlayerRole,
) {
  await guestPage.goto("/join");
  const roleName = role === "hider" ? "Hider" : "Seeker";
  await guestPage
    .getByRole("radio", { name: new RegExp(`^${roleName}\\b`) })
    .click();
  await guestPage.getByPlaceholder("ABCD").fill(code);
  await guestPage.getByRole("button", { name: "Join session" }).click();
}

export async function createHostSession(page: Page) {
  await createSessionFromCreatePage(page);
  const code = await readSessionCode(page);
  return { code, page };
}

export async function createMultiplayerContexts(browser: Browser) {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await prepareE2EPage(hostPage);
  await prepareE2EPage(guestPage);

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
