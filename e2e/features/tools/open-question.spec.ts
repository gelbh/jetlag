import {
  test,
  expect,
  ASK_SEND_ARMED_BUTTON,
  clickToolDockButton,
  dismissActiveToolPanel,
  expectAskHud,
  sendRadarToHiders,
} from "../../fixtures";

test("pending question opens tools in preview-only mode", async ({
  hostHider,
}) => {
  const { hostPage } = hostHider;

  await test.step("send radar so a pending question exists", async () => {
    await sendRadarToHiders(hostPage);
  });

  await test.step("Radar stay shows finish-open-question copy", async () => {
    await clickToolDockButton(hostPage, "Radar");
    await expect(
      hostPage.getByText("Finish the open question before sending a new one."),
    ).toBeVisible();
  });

  await test.step("Matching opens preview-only without an armed send", async () => {
    await dismissActiveToolPanel(hostPage);
    await clickToolDockButton(hostPage, "Matching");
    await expectAskHud(hostPage);
    await expect(
      hostPage.getByRole("group", { name: "Match category" }),
    ).toBeVisible();
    // Catalog-first preview may omit the strip until configure; never allow send.
    await expect(
      hostPage.getByRole("button", { name: ASK_SEND_ARMED_BUTTON }),
    ).toHaveCount(0);
  });
});
