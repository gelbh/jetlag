import type { Page } from "@playwright/test";
import { clearLieFi, emulateLieFi, expect, openChat, readSyncStatusLabel, test } from "../fixtures";

test.setTimeout(120_000);

async function openSocialChat(page: Page) {
  await openChat(page);
  await page.getByLabel("Chat tabs").getByText("Social", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
}

test("lie-fi: chat send never blocks and the chip stops claiming Synced", async ({ hostHider }) => {
  const { hostPage, guestPage } = hostHider;
  await openSocialChat(hostPage);
  await openSocialChat(guestPage);
  await expect.poll(() => readSyncStatusLabel(hostPage), { timeout: 15_000 }).toBe("Synced");

  // navigator.onLine stays true: only the app's own signals can notice.
  await emulateLieFi(hostPage);

  const input = hostPage.getByRole("textbox", { name: "Message" });
  await input.fill("slow link");
  await input.press("Enter");
  // Fire-and-track: the composer frees up at once and the bubble renders locally.
  await expect(input).toHaveValue("", { timeout: 1_000 });
  await expect(hostPage.locator(".jl-scroll").getByText("slow link")).toBeVisible({
    timeout: 1_000,
  });
  await expect(input).toBeEditable();

  await expect.poll(() => readSyncStatusLabel(hostPage), { timeout: 15_000 }).not.toBe("Synced");

  await clearLieFi(hostPage);
  await expect(guestPage.locator(".jl-scroll").getByText("slow link")).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect.poll(() => readSyncStatusLabel(hostPage), { timeout: 30_000 }).toBe("Synced");
});
