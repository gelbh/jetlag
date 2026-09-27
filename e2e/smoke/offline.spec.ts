import { test, expect, placePin } from "../fixtures";

test("@smoke keeps the map usable while offline", async ({
  localMap,
  context,
}) => {
  test.setTimeout(60_000);

  await test.step("go offline and place a pin", async () => {
    await context.setOffline(true);
    await placePin(localMap, "Offline pin");
  });

  await test.step("restore network; dock tools still reachable", async () => {
    await context.setOffline(false);
    await expect(
      localMap.getByRole("button", { name: "Matching" }),
    ).toBeVisible();
  });
});
