import {
  test,
  expect,
  countMapAnnotations,
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
  placePin,
  resetBoardForEveryone,
  resetSessionProgress,
  sessionElapsedLocator,
  startSessionTimer,
} from "../../fixtures";

test.describe("cross-device sync", () => {
  test("guest sees host pin annotations", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    await test.step("host places shared pin", async () => {
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "seeker");
      await placePin(hostPage, "Shared pin");
    });

    await expect(async () => {
      expect(await countMapAnnotations(guestPage)).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });

    await cleanup();
  });

  test("offline pin queues and syncs when back online", async ({ browser }) => {
    const { hostPage, guestPage, hostContext, cleanup } =
      await createMultiplayerContexts(browser);

    await test.step("queue pin while offline", async () => {
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "seeker");
      await hostContext.setOffline(true);
      await placePin(hostPage, "Offline pin");
      await hostContext.setOffline(false);
    });

    await expect(async () => {
      expect(await countMapAnnotations(guestPage)).toBeGreaterThan(0);
    }).toPass({ timeout: 25_000 });

    await cleanup();
  });

  test("timer state syncs to guest", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    await test.step("host starts session timer", async () => {
      const { code } = await createHostSession(hostPage);
      await joinAsRole(guestPage, code, "seeker");
      await startSessionTimer(hostPage);
    });

    await expect(sessionElapsedLocator(guestPage)).toBeVisible({
      timeout: 15_000,
    });

    await cleanup();
  });

  test("host reset board clears guest annotations", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    const baselineCount = await countMapAnnotations(guestPage);

    await placePin(hostPage, "Temporary");

    await expect(async () => {
      expect(await countMapAnnotations(guestPage)).toBeGreaterThan(
        baselineCount,
      );
    }).toPass({ timeout: 30_000 });

    const afterPinCount = await countMapAnnotations(guestPage);

    await test.step("host resets board for everyone", async () => {
      await resetBoardForEveryone(hostPage);
    });

    await expect(async () => {
      expect(await countMapAnnotations(guestPage)).toBeLessThan(afterPinCount);
    }).toPass({ timeout: 45_000 });

    await cleanup();
  });

  test("host full session reset clears guest progress", async ({ browser }) => {
    test.setTimeout(90_000);

    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    const baselineCount = await countMapAnnotations(guestPage);

    await test.step("start timer and place pin", async () => {
      await placePin(hostPage, "Before reset");
      await startSessionTimer(hostPage);
      await expect(sessionElapsedLocator(guestPage)).toBeVisible({
        timeout: 15_000,
      });
      await expect(async () => {
        expect(await countMapAnnotations(guestPage)).toBeGreaterThan(
          baselineCount,
        );
      }).toPass({ timeout: 30_000 });
    });

    const afterPinCount = await countMapAnnotations(guestPage);

    await test.step("host resets session progress", async () => {
      await resetSessionProgress(hostPage);
    });

    await expect(hostPage.getByRole("button", { name: "Start" })).toBeVisible({
      timeout: 45_000,
    });

    // Tip status copy: full "Waiting" or compact "Wait" on narrow chrome.
    // Scope to the status island so short tokens do not match chat/copy elsewhere.
    // Features project is mobile (no desktop "Map status" region).
    await expect(
      guestPage
        .getByTestId("tool-status-block-mantine")
        .getByText(/^(Waiting|Wait)$/),
    ).toBeVisible({
      timeout: 45_000,
    });

    await expect(sessionElapsedLocator(guestPage)).toBeHidden({
      timeout: 45_000,
    });

    await expect(async () => {
      expect(await countMapAnnotations(guestPage)).toBeLessThan(afterPinCount);
    }).toPass({ timeout: 45_000 });

    await cleanup();
  });
});
