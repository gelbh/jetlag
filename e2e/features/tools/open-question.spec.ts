import {
  test,
  expect,
  clickToolDockButton,
  expectAskHud,
  sendRadarToHiders,
} from "../../fixtures";

test("pending question opens tools in preview-only mode", async ({ hostHider }) => {
  const { hostPage } = hostHider;

  await sendRadarToHiders(hostPage);

  await clickToolDockButton(hostPage, "Radar");
  await expectAskHud(hostPage);
  await expect(
    hostPage.getByText("Finish the open question before sending a new one."),
  ).toBeVisible();

  await clickToolDockButton(hostPage, "Matching");
  await expectAskHud(hostPage);
  await expect(
    hostPage.getByRole("button", { name: /^SEND(?: ·| —|$)/ }),
  ).toBeDisabled();
});
