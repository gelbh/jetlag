import {
  test,
  expect,
  answerPhotoCannotInChat,
  answerPhotoSentExternallyInChat,
  expectChatAnswer,
  openChat,
  sendPhotoToHiders,
} from "../../fixtures";

test.setTimeout(120_000);

test("@smoke photo question syncs cannot-answer replies through chat", async ({
  hostHider,
}) => {
  const { hostPage, guestPage } = hostHider;

  await expect(
    guestPage.getByRole("button", { name: "Set zone" }),
  ).toBeVisible({ timeout: 15_000 });

  await sendPhotoToHiders(hostPage);

  await expect(async () => {
    await openChat(guestPage);
    await expect(
      guestPage.getByText(/Send me a photo of/i).first(),
    ).toBeVisible();
  }).toPass({ timeout: 30_000 });

  await answerPhotoCannotInChat(guestPage);
  await expectChatAnswer(guestPage, "I cannot answer the question");

  await openChat(hostPage);
  await expectChatAnswer(hostPage, "I cannot answer the question");
});

test("photo question accepts mark-sent external answer", async ({ hostHider }) => {
  const { hostPage, guestPage } = hostHider;

  await sendPhotoToHiders(hostPage);

  await expect(async () => {
    await openChat(guestPage);
    await expect(guestPage.getByRole("button", { name: "Mark sent" })).toBeVisible();
  }).toPass({ timeout: 30_000 });

  await answerPhotoSentExternallyInChat(guestPage);
  await expect(
    guestPage.getByText(/Photo sent outside the app/i),
  ).toBeVisible({ timeout: 30_000 });

  await openChat(hostPage);
  await expect(
    hostPage.getByText(/Photo sent outside the app/i),
  ).toBeVisible({ timeout: 30_000 });
});
