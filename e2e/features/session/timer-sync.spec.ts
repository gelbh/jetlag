import {
  test,
  expect,
  createMultiplayerContexts,
  createHostSession,
  dismissMapOnboarding,
  goHomeFromMap,
  joinAsRole,
  openTimerSettings,
  readSessionElapsedSeconds,
  returnToMapFromHome,
  startSessionTimer,
} from "../../fixtures";

test.setTimeout(120_000);

test.describe("timer rejoin", () => {
  test("host leave and rejoin reconciles elapsed time", async ({ browser }) => {
    const { hostPage, cleanup } = await createMultiplayerContexts(browser);
    await createHostSession(hostPage);
    await startSessionTimer(hostPage);

    await hostPage.waitForTimeout(2_500);
    const elapsedBeforeLeave = await readSessionElapsedSeconds(hostPage);

    await goHomeFromMap(hostPage);
    await returnToMapFromHome(hostPage);

    const elapsedAfterRejoin = await readSessionElapsedSeconds(hostPage);
    expect(elapsedAfterRejoin).toBeGreaterThanOrEqual(elapsedBeforeLeave);
    expect(elapsedAfterRejoin).toBeLessThan(elapsedBeforeLeave + 30);

    await cleanup();
  });

  test("guest reload shows timer after brief sync", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await startSessionTimer(hostPage);
    await hostPage.waitForTimeout(2_000);
    const hostElapsed = await readSessionElapsedSeconds(hostPage);

    await guestPage.reload();
    await dismissMapOnboarding(guestPage);

    const guestElapsed = await readSessionElapsedSeconds(guestPage);
    expect(Math.abs(guestElapsed - hostElapsed)).toBeLessThanOrEqual(5);

    await cleanup();
  });

  test("host pause, leave, and rejoin keeps timer paused for guest", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await startSessionTimer(hostPage);
    await openTimerSettings(hostPage);
    await hostPage.getByRole("button", { name: "Pause" }).click();

    const pausedElapsed = await readSessionElapsedSeconds(hostPage);
    await goHomeFromMap(hostPage);
    await returnToMapFromHome(hostPage);

    await expect(
      hostPage.getByRole("button", { name: /Seek phase time|Session elapsed/i }),
    ).toBeVisible();
    const hostAfterRejoin = await readSessionElapsedSeconds(hostPage);
    expect(hostAfterRejoin).toBeGreaterThanOrEqual(pausedElapsed);
    expect(hostAfterRejoin).toBeLessThan(pausedElapsed + 3);

    const guestAfterRejoin = await readSessionElapsedSeconds(guestPage);
    expect(Math.abs(guestAfterRejoin - hostAfterRejoin)).toBeLessThanOrEqual(3);

    await cleanup();
  });
});
