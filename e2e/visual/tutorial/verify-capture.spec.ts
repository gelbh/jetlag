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
  capturePhotoQuestionNoHiders,
  capturePhotoQuestionWithHiders,
  QUESTION_HIDERS_CAPTURES,
  QUESTION_SOLO_CAPTURES,
} from "../../fixtures/tools/question-capture";
import { assertTutorialCaptureReady } from "../../fixtures/tools/tutorial-capture-ready";
import {
  openTutorialMapSession,
  runQuestionCaptures,
} from "../../fixtures/tutorial-capture";

const TUTORIAL_NETWORK = { allowMapTiles: true } as const;
const TMP_ROOT = path.join(os.tmpdir(), "jetlag-tutorial-verify");

test.describe.configure({ mode: "serial" });

test.describe("tutorial question capture preflight", () => {
  test.beforeAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    fs.mkdirSync(TMP_ROOT, { recursive: true });
  });

  test("@manual solo question flows reach map-context and map-result", async ({ page }) => {
    test.setTimeout(600_000);
    await runQuestionCaptures(
      page,
      TMP_ROOT,
      QUESTION_SOLO_CAPTURES.map(([toolId, captureSolo]) => [
        toolId,
        captureSolo,
        { network: TUTORIAL_NETWORK },
      ]),
    );
  });

  test("@manual hiders question flows reach send-ready split screenshots", async ({ page }) => {
    test.setTimeout(600_000);
    const hiderSession = { memberRoles: { "hider-1": "hider" as const } };
    await runQuestionCaptures(
      page,
      TMP_ROOT,
      QUESTION_HIDERS_CAPTURES.map(([toolId, captureHiders]) => [
        toolId,
        captureHiders,
        { network: TUTORIAL_NETWORK, ...hiderSession },
      ]),
    );
  });

  test("@manual photo tutorial reaches unread chat then chat result", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const hiderSession = { memberRoles: { "hider-1": "hider" as const } };

    await openTutorialMapSession(page, { network: TUTORIAL_NETWORK });
    await waitForMapTilesLoaded(page);
    await capturePhotoQuestionNoHiders(page, TMP_ROOT);

    await openTutorialMapSession(page, {
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
