import {
  test,
  expect,
  answerInChat,
  gameChatScroll,
  openChat,
  sendMatchingToHiders,
  sendRadarToHiders,
} from "../../fixtures";

test.describe("hider chat scroll", () => {
  test.setTimeout(120_000);

  test("reaches the second pending answer after the first is answered", async ({
    hostHider,
  }) => {
    const { hostPage, guestPage } = hostHider;

    await test.step("hider sees Set zone; host queues radar then matching", async () => {
      await expect(
        guestPage.getByRole("button", { name: "Set zone" }),
      ).toBeVisible({ timeout: 15_000 });

      await sendRadarToHiders(hostPage);
      await answerInChat(guestPage, "Yes");
      await sendMatchingToHiders(hostPage);
    });

    await test.step("scroll chat to second answer control", async () => {
      await openChat(guestPage);

      const scrollRegion = gameChatScroll(guestPage);
      const secondAnswerButton = scrollRegion.getByRole("button", {
        name: "Send answer: Yes",
      });
      await expect
        .poll(async () => secondAnswerButton.isVisible(), { timeout: 30_000 })
        .toBe(true);

      await expect(scrollRegion).toBeVisible();

      await scrollRegion.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });

      await expect(secondAnswerButton).toBeInViewport();
    });
  });
});
