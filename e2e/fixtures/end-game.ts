import { type Page, expect } from "@playwright/test";
import { clickOverflowToolButton, openSettings } from "./tools/navigation";

export async function requestEndGame(hostPage: Page) {
  hostPage.once("dialog", (dialog) => dialog.accept());
  await clickOverflowToolButton(hostPage, "Start end game");
  await expect(
    hostPage.getByText("Waiting for hider to accept end game"),
  ).toBeVisible({ timeout: 15_000 });
}

export async function acceptEndGame(guestPage: Page) {
  await expect(
    guestPage.getByText("Seekers requested end game"),
  ).toBeVisible({ timeout: 15_000 });
  await guestPage.getByRole("button", { name: "Accept" }).click();
}

export async function declineEndGame(guestPage: Page) {
  await guestPage.getByRole("button", { name: "Decline" }).click();
}

export async function expectEndGameStarted(hostPage: Page, guestPage: Page) {
  await expect(hostPage.getByText("End game started")).toBeVisible({
    timeout: 15_000,
  });
  await expect(guestPage.getByText("End game started")).toBeVisible({
    timeout: 15_000,
  });
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
