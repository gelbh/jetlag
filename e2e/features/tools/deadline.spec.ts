import {
  answerInChat,
  backdatePendingQuestionDeadline,
  expect,
  expectChatAnswer,
  listPendingQuestionIds,
  openChat,
  readPersistedSessionId,
  sendRadarToHiders,
  startSessionTimer,
  test,
} from "../../fixtures";

test.setTimeout(120_000);

test("@smoke enforces answer deadlines with a system message and timer pause", async ({
  hostHider,
}) => {
  const { hostPage, guestPage } = hostHider;

  await test.step("start timer and send radar", async () => {
    await startSessionTimer(hostPage);
    await sendRadarToHiders(hostPage);
  });

  await test.step("backdate the answer window so the deadline has passed", async () => {
    const sessionId = await readPersistedSessionId(hostPage);
    await expect(async () => {
      const questionIds = await listPendingQuestionIds(hostPage, sessionId);
      expect(questionIds.length).toBeGreaterThan(0);
    }).toPass({ timeout: 20_000 });

    const [questionId] = await listPendingQuestionIds(hostPage, sessionId);
    await backdatePendingQuestionDeadline(
      sessionId,
      questionId,
      new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    );
  });

  await test.step("host sees deadline system message; late answer still records", async () => {
    await openChat(hostPage);
    await expect(hostPage.getByText(/Answer deadline passed/i)).toBeVisible({
      timeout: 30_000,
    });

    await answerInChat(guestPage, "Yes");
    await expectChatAnswer(guestPage, "yes");
  });
});
