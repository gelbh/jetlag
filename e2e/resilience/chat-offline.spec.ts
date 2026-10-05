import type { Page } from "@playwright/test";
import { expect, goOffline, goOnline, openChat, pendingSyncBadges, test } from "../fixtures";

test.setTimeout(120_000);

async function openSocialChat(page: Page) {
  await openChat(page);
  await page.getByLabel("Chat tabs").getByText("Social", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
}

/** Own + others' social bubbles in render order (the list is sorted by createdAt). */
function socialBubbleTexts(page: Page) {
  return page
    .locator(".jl-scroll")
    .getByText(/^[abc]$/)
    .allTextContents()
    .then((texts) => texts.map((text) => text.trim()));
}

test("chats sent offline arrive once each, in order", async ({ hostHider }) => {
  const { hostPage, guestPage, hostContext } = hostHider;

  await openSocialChat(hostPage);
  await openSocialChat(guestPage);

  await goOffline(hostContext);
  const input = hostPage.getByRole("textbox", { name: "Message" });
  for (const text of ["a", "b", "c"]) {
    await input.fill(text);
    await input.press("Enter");
    await expect(input).toHaveValue("");
  }
  await expect(pendingSyncBadges(hostPage)).toHaveCount(3, { timeout: 5_000 });
  await expect.poll(() => socialBubbleTexts(guestPage)).toEqual([]);

  await goOnline(hostContext);

  await expect(pendingSyncBadges(hostPage)).toHaveCount(0, { timeout: 10_000 });
  await expect
    .poll(() => socialBubbleTexts(guestPage), { timeout: 15_000 })
    .toEqual(["a", "b", "c"]);
});
