import { test, expect } from "./fixtures";
import {
  confirmHidingZone,
  confirmInitialHidingZoneAtStation,
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
  openChat,
  openHidingZoneWizard,
  selectTransitStation,
  waitForHidingZoneWizard,
} from "./fixtures";

test.describe("hider flows", () => {
  test("opens the hiding zone wizard and loads station choices", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await openHidingZoneWizard(guestPage);
    await expect(
      guestPage.getByRole("button", { name: "Search this area" }),
    ).toBeVisible();
    await expect(
      guestPage.getByRole("button", { name: "Dublin Central" }),
    ).toBeVisible();

    await cleanup();
  });

  test("loads bus stops by ref in the station picker", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await openHidingZoneWizard(guestPage);
    await expect(guestPage.getByRole("button", { name: "51" })).toBeVisible();

    await cleanup();
  });

  test("confirms a hiding zone at a transit station", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

    await cleanup();
  });

  test("play move requires a different station", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

    guestPage.once("dialog", (dialog) => dialog.accept());
    await guestPage.getByRole("button", { name: "Play Move" }).click();
    await waitForHidingZoneWizard(guestPage);
    await selectTransitStation(guestPage, "Dublin Central");
    await confirmHidingZone(guestPage, true);
    await expect(guestPage.getByText(/different location/i)).toBeVisible();

    await selectTransitStation(guestPage, "North Station");
    await confirmHidingZone(guestPage, true);

    await openChat(hostPage);
    await expect(
      hostPage.getByText(/relocated from Dublin Central/i),
    ).toBeVisible({
      timeout: 15_000,
    });

    await cleanup();
  });
});
