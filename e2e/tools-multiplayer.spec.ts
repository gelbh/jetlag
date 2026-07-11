import { test, expect } from "./fixtures";
import {
  answerInChat,
  createHostSession,
  createMultiplayerContexts,
  expectChatAnswer,
  joinAsRole,
  openChat,
  sendMatchingToHiders,
  sendMeasuringToHiders,
  sendRadarToHiders,
  sendTentacleToHiders,
  sendThermometerToHiders,
  completeRadarSolo,
  PENDING_QUESTION_TEXT,
} from "./fixtures";

test.setTimeout(120_000);

async function runHiderAnswerFlow(
  browser: import("@playwright/test").Browser,
  sendQuestion: (page: import("@playwright/test").Page) => Promise<void>,
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

test.describe("multiplayer question tools", () => {
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

  test("tentacle question reaches hider chat", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await sendTentacleToHiders(hostPage);

    await expect(async () => {
      await openChat(guestPage);
      await expect(guestPage.getByText(PENDING_QUESTION_TEXT).first()).toBeVisible();
    }).toPass({ timeout: 30_000 });

    await cleanup();
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
