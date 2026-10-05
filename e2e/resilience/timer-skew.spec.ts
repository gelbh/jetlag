import {
  createHostSession,
  createMultiplayerContexts,
  expect,
  joinAsRole,
  readSessionElapsedSeconds,
  startSessionTimer,
  test,
  waitForSessionElapsedAtLeast,
} from "../fixtures";

test.setTimeout(120_000);

test("a guest device clock 5 min fast still shows the host's elapsed time", async ({
  browser,
  e2eNetwork,
}) => {
  const { hostPage, guestPage, cleanup } = await createMultiplayerContexts(browser, e2eNetwork);
  // Skew before first navigation so every Date.now() the app sees is 5 min ahead.
  await guestPage.clock.install({ time: Date.now() + 300_000 });

  const { code } = await createHostSession(hostPage);
  await joinAsRole(guestPage, code, "seeker");
  await startSessionTimer(hostPage);
  await waitForSessionElapsedAtLeast(hostPage, 2);

  // serverNow() corrects the guest once its first /api/time sample lands.
  await expect(async () => {
    const [hostElapsed, guestElapsed] = await Promise.all([
      readSessionElapsedSeconds(hostPage),
      readSessionElapsedSeconds(guestPage),
    ]);
    expect(Math.abs(guestElapsed - hostElapsed)).toBeLessThanOrEqual(1);
  }).toPass({ timeout: 15_000 });

  await cleanup();
});
