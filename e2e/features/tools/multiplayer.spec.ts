import {
  test,
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

    await test.step("place radar and arm send", async () => {
      await clickToolDockButton(hostPage, "Radar");
      await expectAskHud(hostPage);
      await selectFirstRadarDistance(hostPage);
      await placeAskAnchor(hostPage);
      await expectSendToHidersInViewport(hostPage);
    });
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

  test("thermometer question syncs answers through chat", async ({
    browser,
  }) => {
    await runHiderAnswerFlow(browser, sendThermometerToHiders, "Hotter");
  });

  test("tentacle question reaches hider chat", async ({ hostHider }) => {
    const { hostPage, guestPage } = hostHider;

    await test.step("send tentacle map-first to hiders", async () => {
      await sendTentacleToHiders(hostPage);
    });

    await test.step("guest sees pending tentacle in chat", async () => {
      await expectPendingQuestionText(guestPage, /Tentacle|nearest|Museum/i);
    });
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
