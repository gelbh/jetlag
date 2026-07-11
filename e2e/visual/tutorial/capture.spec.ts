import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  test,
  expect,
  prepareE2EPage,
  openMapWithLocalSession,
  openSettings,
  expectCreatePageMapPreviewLoaded,
  clickMapAt,
  clickMapCenter,
  selectDrawTool,
  advanceHidingZoneWizardToLocation,
  confirmInitialHidingZoneAtStation,
  sendPhotoToHiders,
  sendRadarToHiders,
  openChat,
  answerPhotoCannotInChat,
  createMultiplayerContexts,
  createHostSession,
  joinAsRole,
  waitForMapTilesLoaded,
} from "../../fixtures";
import {
  captureMatchingQuestionHiders,
  captureMatchingQuestionSolo,
  captureMeasuringQuestionHiders,
  captureMeasuringQuestionSolo,
  capturePhotoQuestionNoHiders,
  capturePhotoQuestionWithHiders,
  captureRadarQuestionHiders,
  captureRadarQuestionSolo,
  captureTentacleQuestionHiders,
  captureTentacleQuestionSolo,
  captureThermometerQuestionHiders,
  captureThermometerQuestionSolo,
} from "../../fixtures/tools/question-capture";
import {
  captureTutorialViewport,
  openTutorialQuestionSession,
} from "../../fixtures/tutorial-capture";
import { assertTutorialCaptureReady } from "../../fixtures/tools/tutorial-capture-ready";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const TUTORIAL_DIR = path.join(ROOT, "public/tutorial");
const TUTORIAL_NETWORK = { allowMapTiles: true } as const;

function tutorialAsset(...segments: string[]) {
  const full = path.join(TUTORIAL_DIR, ...segments);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  return full;
}

async function captureViewport(page: import("@playwright/test").Page, filePath: string) {
  await waitForMapTilesLoaded(page);
  await page.screenshot({
    path: filePath,
    animations: "disabled",
  });
}

test.describe.configure({ mode: "serial" });

test.describe("tutorial asset capture", () => {
  test("captures core screens", async ({ page }) => {
    await prepareE2EPage(page, TUTORIAL_NETWORK);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Create session" })).toBeVisible();
    await captureViewport(page, tutorialAsset("core", "home.png"));

    await page.goto("/join");
    await expect(page.getByRole("heading", { name: "Session code" })).toBeVisible();
    await captureViewport(page, tutorialAsset("core", "join.png"));

    await page.goto("/create");
    await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
    await page.getByRole("button", { name: "Find place" }).click();
    await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expectCreatePageMapPreviewLoaded(page);
    await waitForMapTilesLoaded(page);
    const hudPanel = page.locator(".hud-panel").filter({
      hasText: /sq mi play area/i,
    });
    await hudPanel.screenshot({
      path: tutorialAsset("core", "create-hud.png"),
      animations: "disabled",
    });

    await openMapWithLocalSession(page, { network: TUTORIAL_NETWORK });
    await waitForMapTilesLoaded(page);
    await captureViewport(page, tutorialAsset("core", "tool-dock.png"));

    await page.getByRole("button", { name: "More tools" }).click();
    await expect(page.getByRole("dialog", { name: "More tools" })).toBeVisible();
    await captureViewport(page, tutorialAsset("core", "tool-overflow.png"));
    await page.keyboard.press("Escape");
  });

  test("captures question tutorial assets", async ({ page, browser }) => {
    test.setTimeout(600_000);
    const hiderSession = { memberRoles: { "hider-1": "hider" as const } };

    const soloCaptures = [
      ["matching", captureMatchingQuestionSolo],
      ["measuring", captureMeasuringQuestionSolo],
      ["thermometer", captureThermometerQuestionSolo],
      ["radar", captureRadarQuestionSolo],
      ["tentacle", captureTentacleQuestionSolo],
    ] as const;

    for (const [toolId, captureSolo] of soloCaptures) {
      await openTutorialQuestionSession(page, toolId, "solo", {
        network: TUTORIAL_NETWORK,
      });
      await waitForMapTilesLoaded(page);
      await captureSolo(page, TUTORIAL_DIR);
    }

    const hiderCaptures = [
      ["matching", captureMatchingQuestionHiders],
      ["measuring", captureMeasuringQuestionHiders],
      ["thermometer", captureThermometerQuestionHiders],
      ["radar", captureRadarQuestionHiders],
      ["tentacle", captureTentacleQuestionHiders],
    ] as const;

    for (const [toolId, captureHiders] of hiderCaptures) {
      await openTutorialQuestionSession(page, toolId, "hiders", {
        network: TUTORIAL_NETWORK,
        ...hiderSession,
      });
      await waitForMapTilesLoaded(page);
      await captureHiders(page, TUTORIAL_DIR);
    }

    await openTutorialQuestionSession(page, "photo", "dock", {
      network: TUTORIAL_NETWORK,
    });
    await waitForMapTilesLoaded(page);
    await capturePhotoQuestionNoHiders(page, TUTORIAL_DIR);

    await openTutorialQuestionSession(page, "photo", "hiders", {
      network: TUTORIAL_NETWORK,
      ...hiderSession,
    });
    await waitForMapTilesLoaded(page);
    await capturePhotoQuestionWithHiders(page, TUTORIAL_DIR);

    const { hostPage, guestPage, cleanup } = await createMultiplayerContexts(
      browser,
      TUTORIAL_NETWORK,
    );

    try {
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "hider");
      await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");
      await sendPhotoToHiders(hostPage);
      await answerPhotoCannotInChat(guestPage);
      await assertTutorialCaptureReady(hostPage, "photo-context");
      await waitForMapTilesLoaded(hostPage);
      await captureTutorialViewport(
        hostPage,
        tutorialAsset("questions", "photo", "map", "context.png"),
      );
      await openChat(hostPage);
      await assertTutorialCaptureReady(hostPage, "photo-result");
      await waitForMapTilesLoaded(hostPage);
      await captureTutorialViewport(
        hostPage,
        tutorialAsset("questions", "photo", "map", "result.png"),
      );
    } finally {
      await cleanup();
    }
  });

  test("captures markup tool panels", async ({ page }) => {
    await openMapWithLocalSession(page, { network: TUTORIAL_NETWORK });
    await waitForMapTilesLoaded(page);

    await selectDrawTool(page, "Zone");
    await clickMapAt(page, 0.45, 0.45);
    await clickMapAt(page, 0.55, 0.45);
    await clickMapAt(page, 0.5, 0.52);
    await expect(page.getByText(/Vertices:\s*3/i)).toBeVisible({ timeout: 15_000 });
    await captureViewport(page, tutorialAsset("tools", "zone.png"));

    await selectDrawTool(page, "Pin");
    await clickMapCenter(page);
    await expect(page.getByText("Location pinned on the map.")).toBeVisible();
    await captureViewport(page, tutorialAsset("tools", "pin.png"));
  });

  test("captures hider screens", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } = await createMultiplayerContexts(
      browser,
      TUTORIAL_NETWORK,
    );

    try {
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "hider");
      await waitForMapTilesLoaded(guestPage);

      await guestPage.getByRole("button", { name: /Set zone|Change zone/i }).click();
      await advanceHidingZoneWizardToLocation(guestPage);
      await captureViewport(guestPage, tutorialAsset("hider", "zone-wizard.png"));
      await guestPage.getByRole("button", { name: /^Close / }).click();

      await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");
      await waitForMapTilesLoaded(guestPage);
      await captureViewport(guestPage, tutorialAsset("hider", "map.png"));

      await sendRadarToHiders(hostPage);
      await openChat(guestPage);
      await expect(guestPage.getByText(/Are you within/i).first()).toBeVisible({
        timeout: 30_000,
      });
      await captureViewport(guestPage, tutorialAsset("hider", "chat.png"));
    } finally {
      await cleanup();
    }
  });

  test("captures extras screens", async ({ page }) => {
    await prepareE2EPage(page, TUTORIAL_NETWORK);
    await page.goto("/presets");
    await expect(page.getByRole("heading", { name: "Custom games" })).toBeVisible({
      timeout: 15_000,
    });
    await captureViewport(page, tutorialAsset("extras", "presets.png"));

    await page.route("**/*getPremiumEntitlements*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            premiumSessionCredits: 2,
            lifetimePremium: false,
            subscription: null,
            trialUsedAt: null,
            canCreatePremium: true,
            hasUnlimitedPremium: false,
          },
        }),
      });
    });

    await page.goto("/premium");
    await page.waitForFunction(
      () => window.__JETLAG_E2E__?.signInPermanentUserForCapture != null,
    );
    await page.evaluate(async () => {
      await window.__JETLAG_E2E__!.signInPermanentUserForCapture!();
    });
    await expect(page.getByRole("heading", { name: /Premium/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: "Session packs" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /1 session/i })).toBeVisible({
      timeout: 15_000,
    });
    await captureViewport(page, tutorialAsset("extras", "premium.png"));

    await openMapWithLocalSession(page, { network: TUTORIAL_NETWORK });
    await openSettings(page);
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await page.getByRole("dialog", { name: "Settings" }).screenshot({
      path: tutorialAsset("extras", "settings.png"),
      animations: "disabled",
    });
  });
});
