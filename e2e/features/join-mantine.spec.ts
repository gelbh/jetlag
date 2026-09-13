import {
  test,
  expect,
  createHostSession,
  createMultiplayerContexts,
  dismissMapOnboarding,
  enablePlayerUiMantine,
} from "../fixtures";

test("Join submit works with Mantine flag on", async ({ browser }) => {
  const { hostPage, guestPage, cleanup } =
    await createMultiplayerContexts(browser);

  const { code } = await createHostSession(hostPage);
  await enablePlayerUiMantine(guestPage);

  // Same path as joinAsRole, but click the SegmentedControl label (radios are hidden).
  await guestPage.goto("/join");
  await guestPage
    .getByRole("radiogroup", { name: "Player side" })
    .locator("label")
    .filter({ hasText: /^Seeker$/ })
    .click();
  await guestPage.getByPlaceholder("ABCD").fill(code);
  await guestPage.getByRole("button", { name: "Join session" }).click();
  await expect(guestPage.getByRole("button", { name: "Radar" })).toBeVisible({
    timeout: 15_000,
  });
  await dismissMapOnboarding(guestPage);

  await cleanup();
});
