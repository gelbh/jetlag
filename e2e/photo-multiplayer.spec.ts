import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "./fixtures";
import {
  answerPhotoCannotInChat,
  createHostSession,
  createMultiplayerContexts,
  expectChatAnswer,
  joinAsRole,
  openChat,
  sendPhotoToHiders,
} from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MINIMAL_JPEG = path.join(__dirname, "fixtures/minimal.jpg");

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

  await answerPhotoCannotInChat(guestPage);
  await expectChatAnswer(guestPage, "I cannot answer the question");

  await openChat(hostPage);
  await expectChatAnswer(hostPage, "I cannot answer the question");

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
  await fileInput.setInputFiles(MINIMAL_JPEG);

  await expect(guestPage.getByText(/Answered with photo|Answered: photo/i)).toBeVisible({
    timeout: 30_000,
  });

  await openChat(hostPage);
  await expect(hostPage.getByText(/Answered with photo|Answered: photo/i)).toBeVisible({
    timeout: 30_000,
  });

  await cleanup();
});
