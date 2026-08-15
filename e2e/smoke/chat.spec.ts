import { test, expect } from "../fixtures";
import {
  answerInChat,
  closePanel,
  confirmInitialHidingZoneAtStation,
  createHostSession,
  createMultiplayerContexts,
  expectChatAnswer,
  expectPendingQuestionText,
  gameChatScroll,
  joinAsRole,
  openChat,
  sendRadarToHiders,
} from "../fixtures";

test("@smoke seeker asks via radar and hider answers in game chat", async ({
  browser,
}) => {
  const { hostPage, guestPage, cleanup } =
    await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);
  await joinAsRole(guestPage, code, "hider");

  await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

  await sendRadarToHiders(hostPage);

  await openChat(hostPage);
  await expect(
    gameChatScroll(hostPage).getByText(/Are you within/i),
  ).toBeVisible({
    timeout: 15_000,
  });
  await closePanel(hostPage);

  await expectPendingQuestionText(guestPage, /Are you within/i);
  await answerInChat(guestPage, "Yes");

  await openChat(guestPage);
  await expect(
    guestPage.getByRole("button", { name: "Close", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await expectChatAnswer(guestPage, "yes");
  await expect(guestPage.getByTestId("hider-truth-reveal-banner")).toBeHidden({
    timeout: 5_000,
  });

  await openChat(hostPage);
  await expectChatAnswer(hostPage, "yes");

  await cleanup();
});
