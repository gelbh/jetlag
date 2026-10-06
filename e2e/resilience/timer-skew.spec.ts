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

test("a guest device clock 5 min fast still shows the host's elapsed time", async ({ browser }) => {
  const { hostPage, guestPage, cleanup } = await createMultiplayerContexts(browser);
  try {
    // Skew before first navigation so every Date.now() the app sees is 5 min ahead.
    // install() alone leaves timers paused; resume so elapsed keeps ticking while skewed.
    await guestPage.clock.install({ time: Date.now() + 300_000 });
    await guestPage.clock.resume();

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");
    await startSessionTimer(hostPage);
    await waitForSessionElapsedAtLeast(hostPage, 2);
    // Guest timer + /api/time probe can lag under emulator load; wait for it to tick
    // before comparing so a stuck-at-0 guest fails here instead of as a 13s drift.
    await waitForSessionElapsedAtLeast(guestPage, 1, { timeout: 45_000 });

    // serverNow() corrects the guest once its first /api/time sample lands.
    // Allow 2s: integer second UI + async dual-page reads under CI load.
    await expect(async () => {
      const [hostElapsed, guestElapsed] = await Promise.all([
        readSessionElapsedSeconds(hostPage),
        readSessionElapsedSeconds(guestPage),
      ]);
      expect(Math.abs(guestElapsed - hostElapsed)).toBeLessThanOrEqual(2);
    }).toPass({ timeout: 30_000 });
  } finally {
    await cleanup();
  }
});
