import {
  test,
  expect,
  clickToolDockButton,
  sendRadarToHiders,
} from "../../fixtures";

test("pending question opens tools in preview-only mode", async ({ hostHider }) => {
  const { hostPage } = hostHider;

  await sendRadarToHiders(hostPage);

  await clickToolDockButton(hostPage, "Radar");
  await expect(
    hostPage.getByText("Finish the open question before sending a new one."),
  ).toBeVisible();

  await clickToolDockButton(hostPage, "Matching");
  await expect(hostPage.getByRole("button", { name: "Close Matching" })).toBeVisible();
  await expect(
    hostPage.getByRole("button", { name: /^Send to hiders \(D\d+P\d+\)$/ }),
  ).toHaveCount(0);
});
