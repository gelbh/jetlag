import type { Page } from "@playwright/test";
import {
  expect,
  goOffline,
  goOnline,
  openSocialChat,
  pendingSyncBadges,
  socialChatScroll,
  test,
} from "../fixtures";

const MESSAGES = ["rz-offline-a", "rz-offline-b", "rz-offline-c"];

/** Bubbles render sorted by createdAt, so DOM order is delivery order. */
function sentBubbleTexts(page: Page) {
  return socialChatScroll(page)
    .getByText(/^rz-offline-[abc]$/)
    .allTextContents()
    .then((texts) => texts.map((text) => text.trim()));
}

test("chats sent offline arrive once each, in order", async ({ hostHider }) => {
  const { hostPage, guestPage, hostContext } = hostHider;

  await openSocialChat(hostPage);
  await openSocialChat(guestPage);

  await goOffline(hostContext);
  const input = hostPage.getByRole("textbox", { name: "Message" });
  for (const text of MESSAGES) {
    await input.fill(text);
    await input.press("Enter");
    await expect(input).toHaveValue("");
  }
  await expect(pendingSyncBadges(hostPage)).toHaveCount(3, { timeout: 5_000 });
  await expect.poll(() => sentBubbleTexts(guestPage)).toEqual([]);

  await goOnline(hostContext);

  await expect(pendingSyncBadges(hostPage)).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(() => sentBubbleTexts(guestPage), { timeout: 15_000 }).toEqual(MESSAGES);
});
