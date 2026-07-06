import { test, expect } from "../fixtures";
import {
  answerInChat,
  closePanel,
  createHostSession,
  createMultiplayerContexts,
  expectChatAnswer,
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

  await expect(
    guestPage.getByRole("button", { name: "Set hiding zone" }),
  ).toBeVisible({ timeout: 15_000 });

  await sendRadarToHiders(hostPage);

  await openChat(hostPage);
  await expect(hostPage.getByText(/Are you within/i)).toBeVisible({
    timeout: 15_000,
  });
  await closePanel(hostPage);

  await openChat(guestPage);
  await expect(guestPage.getByText(/Are you within/i)).toBeVisible({
    timeout: 20_000,
  });
  await answerInChat(guestPage, "Yes");
  await expectChatAnswer(guestPage, "yes");

  await openChat(hostPage);
  await expectChatAnswer(hostPage, "yes");

  await cleanup();
});
