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

async function dispatchVisibilityChange(page: Page) {
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
}

// fixme: ~1/5 runs: offline lands mid membership-heal getDocFromServer; lastSyncError sticks as 'Sync issue' after reconnect
test.fixme("five minutes offline then resume: live again in < 10 s with the same uid", async ({
  page,
  context,
}) => {
  await page.clock.install();
  await prepareE2EPage(page);
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
