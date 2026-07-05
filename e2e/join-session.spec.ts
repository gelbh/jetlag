import { test, expect } from "@playwright/test";
import { createSessionFromCreatePage, prepareE2EPage } from "./fixtures/app";

test("host and guest share annotations through the emulator", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await prepareE2EPage(hostPage);
  await prepareE2EPage(guestPage);

  await createSessionFromCreatePage(hostPage);

  const codeText = await hostPage.locator(".font-mono.tabular-nums").textContent();
  expect(codeText).toMatch(/^[A-Z]{4}$/);

  await guestPage.goto("/join");
  await guestPage.getByPlaceholder("ABCD").fill(codeText ?? "ABCD");
  await guestPage.getByRole("button", { name: "Join session" }).click();
  await expect(guestPage.getByRole("button", { name: "Pin" })).toBeVisible({
    timeout: 15_000,
  });

  await hostContext.close();
  await guestContext.close();
});
