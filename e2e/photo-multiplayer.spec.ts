import { test, expect } from "./fixtures";
import {
  answerInChat,
  createHostSession,
  createMultiplayerContexts,
  expectChatAnswer,
  joinAsRole,
  openChat,
  sendPhotoToHiders,
} from "./fixtures";

test.setTimeout(120_000);

test("@smoke photo question syncs cannot-answer replies through chat", async ({
  browser,
}) => {
  const { hostPage, guestPage, cleanup } =
    await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);
  await joinAsRole(guestPage, code, "hider");

  await expect(
    guestPage.getByRole("button", { name: "Set hiding zone" }),
  ).toBeVisible({ timeout: 15_000 });

  await sendPhotoToHiders(hostPage);

  await expect(async () => {
    await openChat(guestPage);
    await expect(
      guestPage.getByText(/Send me a photo of/i).first(),
    ).toBeVisible();
  }).toPass({ timeout: 30_000 });

  await answerInChat(guestPage, "I cannot answer the question");
  await expectChatAnswer(guestPage, "cannot answer");

  await openChat(hostPage);
  await expectChatAnswer(hostPage, "cannot answer");

  await cleanup();
});

test("photo question accepts an uploaded answer", async ({ browser }) => {
  const { hostPage, guestPage, cleanup } =
    await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);
  await joinAsRole(guestPage, code, "hider");

  await sendPhotoToHiders(hostPage);

  await expect(async () => {
    await openChat(guestPage);
    await expect(guestPage.getByText(/Upload photo/i)).toBeVisible();
  }).toPass({ timeout: 30_000 });

  const fileInput = guestPage.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "answer.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]),
  });

  await expect(guestPage.getByText(/Answered with photo|Answered: photo/i)).toBeVisible({
    timeout: 30_000,
  });

  await openChat(hostPage);
  await expect(hostPage.getByText(/Answered with photo|Answered: photo/i)).toBeVisible({
    timeout: 30_000,
  });

  await cleanup();
});
