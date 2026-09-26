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

    await expect(
      guestPage.getByRole("button", { name: "Set zone" }),
    ).toBeVisible({ timeout: 15_000 });

    await sendRadarToHiders(hostPage);
    await answerInChat(guestPage, "Yes");

    await sendMatchingToHiders(hostPage);
    await openChat(guestPage);

    const scrollRegion = gameChatScroll(guestPage);
    // Recommended truth suffixes aria-label; prefer the latest pending Yes.
    const secondAnswerButton = scrollRegion
      .getByRole("button", { name: /Send answer:\s*Yes/i })
      .last();
    await expect(secondAnswerButton).toBeVisible({ timeout: 30_000 });

    await expect(scrollRegion).toBeVisible();

    const scrollMetrics = await scrollRegion.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));

    expect(scrollMetrics.scrollHeight).toBeGreaterThan(
      scrollMetrics.clientHeight,
    );

    await scrollRegion.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(secondAnswerButton).toBeInViewport();
  });
});
