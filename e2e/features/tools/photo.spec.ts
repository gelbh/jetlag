import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  test,
  expect,
  answerPhotoCannotInChat,
  expectChatAnswer,
  openChat,
  sendPhotoToHiders,
} from "../../fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MINIMAL_JPEG = path.join(__dirname, "../../fixtures/minimal.jpg");

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

test("photo question accepts an uploaded answer", async ({ hostHider }) => {
  const { hostPage, guestPage } = hostHider;

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
});
