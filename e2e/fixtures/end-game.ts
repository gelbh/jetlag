import { type Page, expect } from "@playwright/test";
import { openSettings } from "./tools/navigation";

export async function startEndGameFromFoundStation(hostPage: Page) {
  hostPage.once("dialog", (dialog) => dialog.accept());
  await hostPage
    .getByRole("button", {
      name: "Declare found hiding-zone station / start end game",
    })
    .click();
}

export async function expectEndGameStarted(hostPage: Page, guestPage: Page) {
  // Assert both sides together so an optimistic local host banner cannot pass alone
  // before the server write is accepted and synced to the hider.
  await expect
    .poll(
      async () => {
        const hostVisible = await hostPage
          .getByText("End game started")
          .isVisible()
          .catch(() => false);
        const guestVisible = await guestPage
          .getByText("End game started")
          .isVisible()
          .catch(() => false);
        return hostVisible && guestVisible;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}

export async function expectEndGameRestrictions(hostPage: Page) {
  await openSettings(hostPage);
  await hostPage.getByRole("tab", { name: "Session" }).click();
  await expect(hostPage.getByRole("button", { name: "Clear map" })).toBeDisabled();
  await expect(
    hostPage.getByText("Clear map and reset board are unavailable during end game."),
  ).toBeVisible();
  await hostPage.getByRole("button", { name: "Close" }).click();
}

export async function cancelEndGame(hostPage: Page) {
  await expect(hostPage.getByRole("button", { name: "End end game" })).toBeVisible();
  await hostPage.getByRole("button", { name: "End end game" }).click();
  await expect
    .poll(async () => hostPage.getByText("End game started").isHidden(), {
      timeout: 30_000,
    })
    .toBe(true);
}
