import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  test,
  createMultiplayerContexts,
  createHostSession,
  joinAsRole,
  confirmInitialHidingZoneAtStation,
  sendPhotoToHiders,
  openChat,
  answerPhotoCannotInChat,
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
import { assertTutorialCaptureReady } from "../../fixtures/tools/tutorial-capture-ready";
import { openTutorialQuestionSession } from "../../fixtures/tutorial-capture";

const TUTORIAL_NETWORK = { allowMapTiles: true } as const;
const TMP_ROOT = path.join(os.tmpdir(), "jetlag-tutorial-verify");

test.describe.configure({ mode: "serial" });

test.describe("tutorial question capture preflight", () => {
  test.beforeAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    fs.mkdirSync(TMP_ROOT, { recursive: true });
  });

  test("solo question flows reach map-context and map-result", async ({ page }) => {
    test.setTimeout(600_000);
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
      await captureSolo(page, TMP_ROOT);
    }
  });

  test("hiders question flows reach send-ready split screenshots", async ({ page }) => {
    test.setTimeout(600_000);
    const hiderSession = { memberRoles: { "hider-1": "hider" as const } };
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
      await captureHiders(page, TMP_ROOT);
    }
  });

  test("photo tutorial reaches unread chat then chat result", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const hiderSession = { memberRoles: { "hider-1": "hider" as const } };

    await openTutorialQuestionSession(page, "photo", "dock", {
      network: TUTORIAL_NETWORK,
    });
    await waitForMapTilesLoaded(page);
    await capturePhotoQuestionNoHiders(page, TMP_ROOT);

    await openTutorialQuestionSession(page, "photo", "hiders", {
      network: TUTORIAL_NETWORK,
      ...hiderSession,
    });
    await waitForMapTilesLoaded(page);
    await capturePhotoQuestionWithHiders(page, TMP_ROOT);

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
      await openChat(hostPage);
      await assertTutorialCaptureReady(hostPage, "photo-result");
    } finally {
      await cleanup();
    }
  });
});
