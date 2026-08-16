import {
  test,
  expect,
  answerInChat,
  expectChatAnswer,
  listPendingQuestionIds,
  openChat,
  patchPendingQuestionAnswerableAt,
  readPersistedSessionId,
  sendRadarToHiders,
} from "../../fixtures";

test.setTimeout(120_000);

test("@smoke enforces answer deadlines with a system message and timer pause", async ({
  hostHider,
}) => {
  const { hostPage, guestPage } = hostHider;

  await hostPage.getByRole("button", { name: "Start" }).click();
  await sendRadarToHiders(hostPage);

  const sessionId = await readPersistedSessionId(hostPage);
  await expect(async () => {
    const questionIds = await listPendingQuestionIds(hostPage, sessionId);
    expect(questionIds.length).toBeGreaterThan(0);
  }).toPass({ timeout: 20_000 });

  const [questionId] = await listPendingQuestionIds(hostPage, sessionId);
  await patchPendingQuestionAnswerableAt(
    hostPage,
    sessionId,
    questionId,
    new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  );

  await openChat(hostPage);
  await expect(hostPage.getByText(/Answer deadline passed/i)).toBeVisible({
    timeout: 30_000,
  });

  await answerInChat(guestPage, "Yes");
  await expectChatAnswer(guestPage, "yes");
});
