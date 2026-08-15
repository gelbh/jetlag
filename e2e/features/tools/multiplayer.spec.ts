import {
  test,
  expect,
  createHostSession,
  createMultiplayerContexts,
  completeRadarSolo,
  expectPendingQuestionText,
  runHiderAnswerFlow,
  sendMatchingToHiders,
  sendMeasuringToHiders,
  sendRadarToHiders,
  sendTentacleToHiders,
  sendThermometerToHiders,
  clickToolDockButton,
  expectAskHud,
  expectSendToHidersInViewport,
  placeAskAnchor,
  selectFirstRadarDistance,
} from "../../fixtures";

test.setTimeout(120_000);

test.describe("multiplayer question tools", () => {
  test("radar send to hiders stays in viewport on send step", async ({
    hostHider,
  }) => {
    const { hostPage } = hostHider;

    await clickToolDockButton(hostPage, "Radar");
    await expectAskHud(hostPage);
    await placeAskAnchor(hostPage);
    await selectFirstRadarDistance(hostPage);
    await expectSendToHidersInViewport(hostPage);
  });

  test("radar question syncs answers through chat", async ({ browser }) => {
    await runHiderAnswerFlow(browser, sendRadarToHiders, "Yes");
  });

  test("matching question syncs answers through chat", async ({ browser }) => {
    await runHiderAnswerFlow(browser, sendMatchingToHiders, "Yes");
  });

  test("measuring question syncs answers through chat", async ({ browser }) => {
    await runHiderAnswerFlow(browser, sendMeasuringToHiders, "Closer");
  });

  test("thermometer question syncs answers through chat", async ({ browser }) => {
    await runHiderAnswerFlow(browser, sendThermometerToHiders, "Hotter");
  });

  test("tentacle question reaches hider chat", async ({ hostHider }) => {
    const { hostPage, guestPage } = hostHider;

    await sendTentacleToHiders(hostPage);

    await expect(async () => {
      await expectPendingQuestionText(guestPage);
    }).toPass({ timeout: 30_000 });
  });
});

test.describe("solo tools in remote session", () => {
  test("host can commit radar in emulator session", async ({ browser }) => {
    const { hostPage, cleanup } = await createMultiplayerContexts(browser);
    await createHostSession(hostPage);
    await completeRadarSolo(hostPage);
    await cleanup();
  });
});
