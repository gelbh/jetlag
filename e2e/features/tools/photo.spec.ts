import {
  answerPhotoCannotInChat,
  answerPhotoSentExternallyInChat,
  expect,
  expectChatAnswer,
  expectPendingQuestionText,
  gameChatScroll,
  openChat,
  sendPhotoToHiders,
  test,
} from "../../fixtures";

test.setTimeout(120_000);

test("@smoke photo question syncs cannot-answer replies through chat", async ({ hostHider }) => {
  const { hostPage, guestPage } = hostHider;

  await test.step("send photo ask once hider is ready", async () => {
    await expect(guestPage.getByRole("button", { name: "Set zone" })).toBeVisible({
      timeout: 15_000,
    });
    await sendPhotoToHiders(hostPage);
    await expect(async () => {
      await expectPendingQuestionText(guestPage, /Send me a photo of/i);
    }).toPass({ timeout: 30_000 });
  });

  await test.step("cannot-answer syncs to both chats", async () => {
    await answerPhotoCannotInChat(guestPage);
    await expectChatAnswer(guestPage, "I cannot answer the question");
    await openChat(hostPage);
    await expectChatAnswer(hostPage, "I cannot answer the question");
  });
});

test("photo question accepts mark-sent external answer", async ({ hostHider }) => {
  const { hostPage, guestPage } = hostHider;

  await test.step("send photo ask", async () => {
    await sendPhotoToHiders(hostPage);
    await expect(async () => {
      await expectPendingQuestionText(guestPage, /Send me a photo of/i);
    }).toPass({ timeout: 30_000 });
  });

  await test.step("mark sent outside app appears in both chats", async () => {
    await answerPhotoSentExternallyInChat(guestPage);
    await openChat(guestPage);
    await expect(gameChatScroll(guestPage).getByText(/Photo sent outside the app/i)).toBeVisible({
      timeout: 30_000,
    });

    await openChat(hostPage);
    await expect(gameChatScroll(hostPage).getByText(/Photo sent outside the app/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});
