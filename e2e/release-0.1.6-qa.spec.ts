import { type Page, expect, test } from "./fixtures";
import {
  advanceRemoteSessionTimerInEmulator,
  clickMapCenter,
  clickOverflowToolButton,
  clickToolDockButton,
  confirmInitialHidingZoneAtStation,
  createHostSession,
  createMultiplayerContexts,
  dismissMapOnboarding,
  joinAsRole,
  openChat,
  openSettings,
  prepareE2EPage,
  readPersistedSessionId,
  sendPhotoToHiders,
  sendRadarToHiders,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

test.setTimeout(120_000);

function parseClockToSeconds(text: string): number {
  const parts = text.trim().split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Could not parse timer text: ${text}`);
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  throw new Error(`Unexpected timer format: ${text}`);
}

async function readSessionElapsedSeconds(page: Page): Promise<number> {
  const sessionButton = page.getByRole("button", {
    name: /Session elapsed|Seek phase time/i,
  });
  await expect(sessionButton).toBeVisible({ timeout: 15_000 });
  const text =
    (await sessionButton.locator(".jl-ticker-value").textContent()) ?? "";
  return parseClockToSeconds(text);
}

async function startSessionTimer(page: Page) {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(
    page.getByRole("button", { name: /Session elapsed|Seek phase time/i }),
  ).toBeVisible({ timeout: 15_000 });
}

async function goHomeFromMap(page: Page) {
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/", { timeout: 10_000 });
}

async function returnToMapFromHome(page: Page) {
  await page.getByRole("button", { name: /Return to map/i }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
}

async function openTimerSettings(page: Page) {
  await page
    .getByRole("button", { name: /Seek phase time|Session elapsed/i })
    .click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
}

test.describe("0.1.6 QA — setup", () => {
  test("host creates session, hider joins, guest sees timer after host starts", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await startSessionTimer(hostPage);
    await expect(guestPage.getByText(/\d{1,2}:\d{2}/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(guestPage.getByText("Waiting…")).toBeHidden();

    await cleanup();
  });
});

test.describe("0.1.6 QA — timer rejoin", () => {
  test("host leave and rejoin reconciles elapsed time", async ({ browser }) => {
    const { hostPage, cleanup } = await createMultiplayerContexts(browser);
    await createHostSession(hostPage);
    await startSessionTimer(hostPage);

    await hostPage.waitForTimeout(2_500);
    const elapsedBeforeLeave = await readSessionElapsedSeconds(hostPage);

    await goHomeFromMap(hostPage);
    await returnToMapFromHome(hostPage);

    const elapsedAfterRejoin = await readSessionElapsedSeconds(hostPage);
    expect(elapsedAfterRejoin).toBeGreaterThanOrEqual(elapsedBeforeLeave);
    expect(elapsedAfterRejoin).toBeLessThan(elapsedBeforeLeave + 30);

    await cleanup();
  });

  test("guest reload shows timer after brief sync", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await startSessionTimer(hostPage);
    await hostPage.waitForTimeout(2_000);
    const hostElapsed = await readSessionElapsedSeconds(hostPage);

    await guestPage.reload();
    await dismissMapOnboarding(guestPage);

    const guestElapsed = await readSessionElapsedSeconds(guestPage);
    expect(Math.abs(guestElapsed - hostElapsed)).toBeLessThanOrEqual(5);

    await cleanup();
  });

  test("host pause, leave, and rejoin keeps timer paused for guest", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await startSessionTimer(hostPage);
    await openTimerSettings(hostPage);
    await hostPage.getByRole("button", { name: "Pause" }).click();

    const pausedElapsed = await readSessionElapsedSeconds(hostPage);
    await goHomeFromMap(hostPage);
    await returnToMapFromHome(hostPage);

    await expect(
      hostPage.getByRole("button", { name: /Seek phase time|Session elapsed/i }),
    ).toBeVisible();
    const hostAfterRejoin = await readSessionElapsedSeconds(hostPage);
    expect(hostAfterRejoin).toBeGreaterThanOrEqual(pausedElapsed);
    expect(hostAfterRejoin).toBeLessThan(pausedElapsed + 3);

    const guestAfterRejoin = await readSessionElapsedSeconds(guestPage);
    expect(Math.abs(guestAfterRejoin - hostAfterRejoin)).toBeLessThanOrEqual(3);

    await cleanup();
  });
});

test.describe("0.1.6 QA — end game flow", () => {
  test("decline clears pending; accept starts end game; cancel and reset work", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");
    await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

    await startSessionTimer(hostPage);
    await dismissMapOnboarding(hostPage);

    hostPage.once("dialog", (dialog) => dialog.accept());
    await clickOverflowToolButton(hostPage, "Start end game");

    await expect(
      hostPage.getByText("Waiting for hider to accept end game"),
    ).toBeVisible({ timeout: 15_000 });
    await guestPage.getByRole("button", { name: "Decline" }).click();
    await expect(
      hostPage.getByText("Waiting for hider to accept end game"),
    ).toBeHidden({ timeout: 15_000 });

    hostPage.once("dialog", (dialog) => dialog.accept());
    await clickOverflowToolButton(hostPage, "Start end game");
    await guestPage.getByRole("button", { name: "Accept" }).click();
    await expect(hostPage.getByText("End game started")).toBeVisible({
      timeout: 15_000,
    });

    await openSettings(hostPage);
    await hostPage.getByRole("tab", { name: "Session" }).click();
    await expect(hostPage.getByRole("button", { name: "Clear map" })).toBeDisabled();
    await expect(
      hostPage.getByText("Clear map and reset board are unavailable during end game."),
    ).toBeVisible();
    await hostPage.getByRole("button", { name: "Close" }).click();

    await expect(hostPage.getByRole("button", { name: "End end game" })).toBeVisible();
    await hostPage.getByRole("button", { name: "End end game" }).click();
    await expect(hostPage.getByText("End game started")).toBeHidden({
      timeout: 15_000,
    });

    await cleanup();
  });
});

test.describe("0.1.6 QA — photo upload", () => {
  test("fresh hider can upload after role sync", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await sendPhotoToHiders(hostPage);

    await expect(async () => {
      await openChat(guestPage);
      await expect(guestPage.getByText(/Upload photo/i)).toBeVisible();
    }).toPass({ timeout: 30_000 });

    const uploadButton = guestPage.getByRole("button", { name: /Upload photo/i });
    await expect(uploadButton).toBeEnabled({ timeout: 30_000 });
    await expect(guestPage.getByText("Syncing your role")).toBeHidden();

    await cleanup();
  });
});

test.describe("0.1.6 QA — map tools", () => {
  test("radar multiplayer sends only after distance step", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await clickToolDockButton(hostPage, "Radar");
    await clickMapCenter(hostPage);
    await hostPage.getByRole("button", { name: "Next" }).click();

    const sendButton = hostPage.getByRole("button", {
      name: /^Send to hiders \(D\d+P\d+\)$/,
    });
    await expect(sendButton).toBeDisabled();
    await hostPage.getByRole("button", { name: "1 Mile" }).click();
    await expect(sendButton).toBeEnabled({ timeout: 15_000 });

    await cleanup();
  });

  test("pending question opens tools in preview-only mode", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await sendRadarToHiders(hostPage);

    await clickToolDockButton(hostPage, "Radar");
    await expect(
      hostPage.getByText("Finish the open question before sending a new one."),
    ).toBeVisible();

    await clickToolDockButton(hostPage, "Matching");
    await expect(hostPage.getByRole("button", { name: "Close Matching" })).toBeVisible();
    await expect(
      hostPage.getByRole("button", { name: /^Send to hiders \(D\d+P\d+\)$/ }),
    ).toHaveCount(0);

    await cleanup();
  });
});

test.describe("0.1.6 QA — platform", () => {
  test("create session exposes back link to home", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await page.getByRole("link", { name: /Back/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("leave session navigates home without ending remote session", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await openSettings(hostPage);
    await hostPage.getByRole("tab", { name: "Session" }).click();
    hostPage.once("dialog", (dialog) => dialog.accept());
    await hostPage.getByRole("button", { name: "Leave session" }).click();
    await expect(hostPage).toHaveURL("/", { timeout: 15_000 });

    await expect(guestPage.getByRole("button", { name: "Radar" })).toBeVisible();

    await cleanup();
  });
});

test.describe("0.1.6 QA — hider zone advisory", () => {
  test("shows advisory when hider GPS is outside zone after hiding period", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");
    await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

    await startSessionTimer(hostPage);
    const sessionId = await readPersistedSessionId(hostPage);
    await advanceRemoteSessionTimerInEmulator(hostPage, sessionId, 61 * 60 * 1000);

    await guestPage.context().setGeolocation({
      latitude: 53.1,
      longitude: -6.9,
    });
    await guestPage.reload();
    await dismissMapOnboarding(guestPage);
    await expect(
      guestPage.getByRole("button", { name: /Session elapsed|Seek phase time/i }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      guestPage.getByText(/outside your hiding zone/i),
    ).toBeVisible({ timeout: 20_000 });

    await cleanup();
  });
});
