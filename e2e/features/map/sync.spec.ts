import {
  test,
  expect,
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
  openSettings,
  placePin,
} from "../../fixtures";

test.describe("cross-device sync", () => {
  test("guest sees host pin annotations", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await placePin(hostPage, "Shared pin");

    await expect(async () => {
      const shapes = guestPage.locator(
        ".leaflet-overlay-pane .leaflet-interactive",
      );
      expect(await shapes.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });

    await cleanup();
  });

  test("offline pin queues and syncs when back online", async ({ browser }) => {
    const { hostPage, guestPage, hostContext, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await hostContext.setOffline(true);
    await placePin(hostPage, "Offline pin");
    await hostContext.setOffline(false);

    await expect(async () => {
      const shapes = guestPage.locator(
        ".leaflet-overlay-pane .leaflet-interactive",
      );
      expect(await shapes.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 25_000 });

    await cleanup();
  });

  test("timer state syncs to guest", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    await hostPage.getByRole("button", { name: "Start" }).click();

    await expect(guestPage.getByText(/\d{2}:\d{2}/).first()).toBeVisible({
      timeout: 15_000,
    });

    await cleanup();
  });

  test("host reset board clears guest annotations", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    const guestShapes = guestPage.locator(
      ".leaflet-overlay-pane .leaflet-interactive",
    );
    const baselineCount = await guestShapes.count();

    await placePin(hostPage, "Temporary");

    await expect(async () => {
      expect(await guestShapes.count()).toBeGreaterThan(baselineCount);
    }).toPass({ timeout: 30_000 });

    const afterPinCount = await guestShapes.count();

    hostPage.once("dialog", (dialog) => dialog.accept());
    await openSettings(hostPage);
    await hostPage.getByRole("tab", { name: "Session" }).click();
    await hostPage.getByRole("button", { name: "Reset…" }).click();
    await hostPage
      .getByRole("button", { name: "Reset board for everyone" })
      .click();

    await expect(async () => {
      expect(await guestShapes.count()).toBeLessThan(afterPinCount);
    }).toPass({ timeout: 45_000 });

    await cleanup();
  });

  test("host full session reset clears guest progress", async ({ browser }) => {
    test.setTimeout(90_000);

    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "seeker");

    const guestShapes = guestPage.locator(
      ".leaflet-overlay-pane .leaflet-interactive",
    );
    const baselineCount = await guestShapes.count();

    await placePin(hostPage, "Before reset");
    await hostPage.getByRole("button", { name: "Start" }).click();

    await expect(guestPage.getByText(/\d{2}:\d{2}/).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(async () => {
      expect(await guestShapes.count()).toBeGreaterThan(baselineCount);
    }).toPass({ timeout: 30_000 });

    const afterPinCount = await guestShapes.count();

    hostPage.once("dialog", (dialog) => dialog.accept());
    await openSettings(hostPage);
    await hostPage.getByRole("tab", { name: "Session" }).click();
    await hostPage.getByRole("button", { name: "Reset…" }).click();
    await hostPage
      .getByRole("button", { name: "Reset session progress" })
      .click();

    await expect(hostPage.getByRole("button", { name: "Start" })).toBeVisible({
      timeout: 45_000,
    });

    await expect(guestPage.getByText("Waiting…")).toBeVisible({
      timeout: 45_000,
    });

    await expect(guestPage.getByText(/\d{2}:\d{2}/)).toBeHidden({
      timeout: 45_000,
    });

    await expect(async () => {
      expect(await guestShapes.count()).toBeLessThan(afterPinCount);
    }).toPass({ timeout: 45_000 });

    await cleanup();
  });
});
