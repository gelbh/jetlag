import { type Page, expect } from "@playwright/test";
import { closePanel, openSettings } from "./tools/navigation";

export async function startEndGameFromFoundStation(hostPage: Page) {
  hostPage.once("dialog", (dialog) => dialog.accept());
  await hostPage
    .getByRole("button", {
      name: "Declare found hiding-zone station / start end game",
    })
    .click();
}

export async function expectEndGameStarted(hostPage: Page, guestPage: Page) {
  // Both sides together: optimistic host banner alone must not pass before sync.
  await expect(async () => {
    await expect(hostPage.getByText("End game started")).toBeVisible();
    await expect(guestPage.getByText("End game started")).toBeVisible();
  }).toPass({ timeout: 30_000 });
}

export async function expectEndGameRestrictions(hostPage: Page) {
  await openSettings(hostPage);
  await hostPage.getByRole("tab", { name: "Session" }).click();
  await expect(hostPage.getByRole("button", { name: "Clear map" })).toBeDisabled();
  await expect(
    hostPage.getByText("Clear map and reset board are unavailable during end game."),
  ).toBeVisible();
  // Tip DrawerSheet: withCloseButton={false}; Escape / outside click.
  await closePanel(hostPage);
}

export async function cancelEndGame(hostPage: Page) {
  await expect(hostPage.getByRole("button", { name: "End end game" })).toBeVisible();
  await hostPage.getByRole("button", { name: "End end game" }).click();
  await expect(hostPage.getByText("End game started")).toBeHidden({
    timeout: 30_000,
  });
}
