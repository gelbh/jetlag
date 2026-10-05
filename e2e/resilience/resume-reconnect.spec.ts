import type { Page } from "@playwright/test";
import {
  createHostSession,
  expect,
  goOffline,
  goOnline,
  prepareE2EPage,
  readE2EUid,
  readSyncStatusLabel,
  test,
} from "../fixtures";

test.setTimeout(120_000);

async function dispatchVisibilityChange(page: Page) {
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
}

test("five minutes offline then resume: live again in < 10 s with the same uid", async ({
  page,
  context,
  e2eNetwork,
}) => {
  test.fixme(
    true,
    "~1/5 runs: offline lands mid membership-heal getDocFromServer; lastSyncError sticks as 'Sync issue' after reconnect",
  );
  await page.clock.install();
  await prepareE2EPage(page, e2eNetwork);
  await createHostSession(page);
  await expect.poll(() => readSyncStatusLabel(page), { timeout: 15_000 }).toBe("Synced");
  const uidBefore = await readE2EUid(page);
  expect(uidBefore).toBeTruthy();

  await goOffline(context);
  await dispatchVisibilityChange(page);
  await page.clock.fastForward("05:00");
  await expect.poll(() => readSyncStatusLabel(page)).toMatch(/^Offline/);

  await goOnline(context);
  await dispatchVisibilityChange(page);

  await expect.poll(() => readSyncStatusLabel(page), { timeout: 10_000 }).toBe("Synced");
  expect(await readE2EUid(page)).toBe(uidBefore);
});
