import {
  completeRadarSolo,
  dismissMapOnboarding,
  expect,
  goOffline,
  listPrecachedUrls,
  openMapWithLocalSession,
  test,
  waitForServiceWorkerControl,
} from "../fixtures";

test.setTimeout(120_000);

test("radar shades the map after an offline reload (geometry WASM is precached)", async ({
  page,
  context,
  e2eNetwork,
}) => {
  await openMapWithLocalSession(page, { network: e2eNetwork });
  await completeRadarSolo(page);
  await waitForServiceWorkerControl(page);
  expect(await listPrecachedUrls(page, /\.wasm$/)).not.toHaveLength(0);

  const failedAssets: string[] = [];
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).pathname.startsWith("/assets/")) {
      failedAssets.push(request.url());
    }
  });

  await goOffline(context);
  await page.reload();
  await expect(page.getByRole("button", { name: "Radar" })).toBeVisible({ timeout: 30_000 });
  await dismissMapOnboarding(page);

  await completeRadarSolo(page);
  expect(failedAssets).toEqual([]);
});
