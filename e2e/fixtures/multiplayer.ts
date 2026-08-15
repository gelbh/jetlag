import { type Browser, type Page, expect } from "@playwright/test";
import {
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
} from "./session";
import {
  answerInChat,
  expectChatAnswer,
  expectPendingQuestionText,
  openChat,
} from "./tools/chat";

export async function runHiderAnswerFlow(
  browser: Browser,
  sendQuestion: (page: Page) => Promise<void>,
  answerLabel: string,
) {
  const { hostPage, guestPage, cleanup } =
    await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);
  await joinAsRole(guestPage, code, "hider");

  await expect(
    guestPage.getByRole("button", { name: "Set zone" }),
  ).toBeVisible({ timeout: 15_000 });

  await sendQuestion(hostPage);

  await expect(async () => {
    await expectPendingQuestionText(guestPage);
  }).toPass({ timeout: 30_000 });

  await answerInChat(guestPage, answerLabel);
  await expectChatAnswer(guestPage, answerLabel.toLowerCase());

  await openChat(hostPage);
  await expectChatAnswer(hostPage, answerLabel.toLowerCase());

  await cleanup();
}
