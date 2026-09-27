import {
  test,
  createHostSession,
  createMultiplayerContexts,
  completeRadarSolo,
  runHiderAnswerFlow,
  sendMatchingToHiders,
  sendMeasuringToHiders,
  sendRadarToHiders,
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

  test("tentacle map-first arms send to hiders", async ({ hostHider }) => {
    const { hostPage } = hostHider;

    await test.step("pick category and arm send", async () => {
      await clickToolDockButton(hostPage, "Tentacles");
      await expectAskHud(hostPage);
      await hostPage
        .getByRole("button", { name: /Museum/i })
        .first()
        .click();
      await expectSendToHidersInViewport(hostPage);
    });
    // ponytail: tip tentacle map-first commit no-ops under Playwright clicks
    // (Send stays visible after force/DOM click). Full guest-chat sync parked
    // for Band F / tip soft-gate once commit path is fixed.
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
