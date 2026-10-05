import {
  emulateLieFi,
  expect,
  openSocialChat,
  readSyncStatusLabel,
  socialChatScroll,
  test,
} from "../fixtures";

test("lie-fi: chat send never blocks and the chip stops claiming Synced", async ({ hostHider }) => {
  const { hostPage, guestPage } = hostHider;
  await openSocialChat(hostPage);
  await openSocialChat(guestPage);
  await expect.poll(() => readSyncStatusLabel(hostPage), { timeout: 15_000 }).toBe("Synced");

  // navigator.onLine stays true: only the app's own signals can notice.
  const clearLieFi = await emulateLieFi(hostPage);

  const input = hostPage.getByRole("textbox", { name: "Message" });
  await input.fill("rz-slow-link");
  await input.press("Enter");
  // Fire-and-track: the composer frees up at once and the bubble renders locally.
  await expect(input).toHaveValue("", { timeout: 1_000 });
  await expect(socialChatScroll(hostPage).getByText("rz-slow-link")).toBeVisible({
    timeout: 1_000,
  });
  await expect(input).toBeEditable();

  await expect.poll(() => readSyncStatusLabel(hostPage), { timeout: 15_000 }).not.toBe("Synced");

  await clearLieFi();
  await expect(socialChatScroll(guestPage).getByText("rz-slow-link")).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect.poll(() => readSyncStatusLabel(hostPage), { timeout: 30_000 }).toBe("Synced");
});
