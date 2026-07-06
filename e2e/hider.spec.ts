import { test, expect } from "./fixtures";
import {
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
  openChat,
} from "./fixtures";

test.describe("hider flows", () => {
  test("opens the hiding zone wizard and loads station choices", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await guestPage.getByRole("button", { name: "Set hiding zone" }).click();
    await expect(guestPage.getByPlaceholder("Search stations…")).toBeVisible();
    await expect(guestPage.getByText(/Loading stations/i)).toBeHidden({
      timeout: 30_000,
    });

    await cleanup();
  });

  test.skip("confirms a hiding zone at a transit station", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await guestPage.getByRole("button", { name: "Set hiding zone" }).click();
    await expect(guestPage.getByText(/Loading stations/i)).toBeHidden({
      timeout: 30_000,
    });
    const station = guestPage.getByRole("button", { name: /Central|Station/i }).first();
    await expect(station).toBeVisible({ timeout: 5_000 });
    await station.click();
    await guestPage.getByRole("button", { name: "Confirm hiding zone" }).click();

    await expect(guestPage.getByRole("button", { name: "Play Move" })).toBeVisible({
      timeout: 15_000,
    });

    await cleanup();
  });

  test.skip("play move requires a different station", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await guestPage.getByRole("button", { name: "Set hiding zone" }).click();
    await expect(guestPage.getByText(/Loading stations/i)).toBeHidden({
      timeout: 30_000,
    });
    await guestPage.getByRole("button", { name: "Dublin Central" }).click();
    await guestPage.getByRole("button", { name: "Confirm hiding zone" }).click();
    await expect(guestPage.getByRole("button", { name: "Play Move" })).toBeVisible({
      timeout: 15_000,
    });

    guestPage.once("dialog", (dialog) => dialog.accept());
    await guestPage.getByRole("button", { name: "Play Move" }).click();
    await guestPage.getByRole("button", { name: "Dublin Central" }).click();
    await expect(guestPage.getByText(/different station/i)).toBeVisible();

    await guestPage.getByRole("button", { name: "North Station" }).click();
    await guestPage.getByRole("button", { name: "Confirm hiding zone" }).click();

    await openChat(hostPage);
    await expect(hostPage.getByText(/relocated to North Station/i)).toBeVisible({
      timeout: 15_000,
    });

    await cleanup();
  });
});
