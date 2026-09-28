import {
  test,
  expect,
  createMultiplayerContexts,
  createHostSession,
  dismissMapOnboarding,
  goHomeFromMap,
  joinAsRole,
  pauseSessionTimer,
  readSessionElapsedSeconds,
  returnToMapFromHome,
  sessionElapsedLocator,
  startSessionTimer,
  waitForSessionElapsedAtLeast,
} from "../../fixtures";

test.setTimeout(120_000);

test.describe("timer rejoin", () => {
  test("host leave and rejoin reconciles elapsed time", async ({ browser }) => {
    const { hostPage, cleanup } = await createMultiplayerContexts(browser);

    await test.step("start timer and wait for elapsed tick", async () => {
      await createHostSession(hostPage);
      await startSessionTimer(hostPage);
    });

    const elapsedBeforeLeave = await waitForSessionElapsedAtLeast(hostPage, 2);

    await test.step("leave and return to map", async () => {
      await goHomeFromMap(hostPage);
      await returnToMapFromHome(hostPage);
    });

    const elapsedAfterRejoin = await readSessionElapsedSeconds(hostPage);
    expect(elapsedAfterRejoin).toBeGreaterThanOrEqual(elapsedBeforeLeave);
    expect(elapsedAfterRejoin).toBeLessThan(elapsedBeforeLeave + 30);

    await cleanup();
  });

  test("guest reload shows timer after brief sync", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    await test.step("host starts; guest joins as seeker", async () => {
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "seeker");
      await startSessionTimer(hostPage);
    });

    const hostElapsed = await waitForSessionElapsedAtLeast(hostPage, 2);

    await test.step("guest reload reconciles within a few seconds", async () => {
      await guestPage.reload();
      await dismissMapOnboarding(guestPage);
      const guestElapsed = await readSessionElapsedSeconds(guestPage);
      expect(Math.abs(guestElapsed - hostElapsed)).toBeLessThanOrEqual(5);
    });

    await cleanup();
  });

  test("host pause, leave, and rejoin keeps timer paused for guest", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    await test.step("start then pause on host", async () => {
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "seeker");
      await startSessionTimer(hostPage);
      await pauseSessionTimer(hostPage);
    });

    const pausedElapsed = await readSessionElapsedSeconds(hostPage);

    await test.step("host leave/rejoin keeps pause", async () => {
      await goHomeFromMap(hostPage);
      await returnToMapFromHome(hostPage);

      // Tip remount may flash Pause timer; prove pause via frozen elapsed.
      await expect(sessionElapsedLocator(hostPage)).toBeVisible({
        timeout: 15_000,
      });
      const hostAfterRejoin = await readSessionElapsedSeconds(hostPage);
      expect(hostAfterRejoin).toBeGreaterThanOrEqual(pausedElapsed);
      // Remount can advance one tick before pause state rehydrates.
      expect(hostAfterRejoin).toBeLessThanOrEqual(pausedElapsed + 3);

      const guestAfterRejoin = await readSessionElapsedSeconds(guestPage);
      expect(Math.abs(guestAfterRejoin - hostAfterRejoin)).toBeLessThanOrEqual(
        3,
      );
    });

    await cleanup();
  });
});
