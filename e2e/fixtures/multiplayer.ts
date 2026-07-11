import { type Browser, type Page, expect } from "@playwright/test";
import {
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
} from "./session";
import { answerInChat, expectChatAnswer, openChat } from "./tools/chat";
import { PENDING_QUESTION_TEXT } from "./tools/question-wizards";

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
    await openChat(guestPage);
    await expect(
      guestPage.getByText(PENDING_QUESTION_TEXT).first(),
    ).toBeVisible();
  }).toPass({ timeout: 30_000 });

  await answerInChat(guestPage, answerLabel);
  await expectChatAnswer(guestPage, answerLabel.toLowerCase());

  await openChat(hostPage);
  await expectChatAnswer(hostPage, answerLabel.toLowerCase());

  await cleanup();
}
