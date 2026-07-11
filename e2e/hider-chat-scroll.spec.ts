import { test, expect } from "./fixtures";
import {
  answerInChat,
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
  openChat,
  sendMatchingToHiders,
  sendRadarToHiders,
} from "./fixtures";

test.describe("hider chat scroll", () => {
  test.setTimeout(120_000);

  test("reaches the second pending answer after the first is answered", async ({
    browser,
  }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await expect(
      guestPage.getByRole("button", { name: "Set zone" }),
    ).toBeVisible({ timeout: 15_000 });

    await sendRadarToHiders(hostPage);
    await answerInChat(guestPage, "Yes");

    await sendMatchingToHiders(hostPage);
    await openChat(guestPage);

    const secondAnswerButton = guestPage
      .getByRole("button", { name: "Send answer: Yes" })
      .last();
    await expect(secondAnswerButton).toBeVisible({ timeout: 20_000 });

    const scrollRegion = guestPage.locator(".jl-game-chat-scroll");
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

    await cleanup();
  });
});
