import { test, expect } from "./fixtures";
import {
  clickMapCenter,
  clickOverflowToolButton,
  confirmInitialHidingZoneAtStation,
  createHostSession,
  createMultiplayerContexts,
  dismissMapOnboarding,
  expectCreatePageMapPreviewLoaded,
  joinAsRole,
  prepareE2EPage,
  sendRadarToHiders,
} from "./fixtures";

test.describe("release 0.1.3", () => {
  test("create session keeps place boundary after panning the map", async ({
    page,
  }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
    await page.getByRole("button", { name: "Find place" }).click();

    const playArea = page.getByText(/sq mi play area/i).first();
    await expect(playArea).toBeVisible({ timeout: 10_000 });
    const areaBeforePan = await playArea.textContent();
    await expectCreatePageMapPreviewLoaded(page);

    const map = page.locator(".leaflet-container");
    const box = await map.boundingBox();
    if (!box) {
      throw new Error("Create map is not visible.");
    }

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.35, {
      steps: 12,
    });
    await page.mouse.up();

    await expect(playArea).toHaveText(areaBeforePan ?? "");
  });

  test("changelog sheet hides Technical sections", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Version 0\.1\.3/i }).click();
    await expect(page.getByRole("dialog", { name: "Changelog" })).toBeVisible();
    await expect(page.getByText("End game: hiders accept")).toBeVisible();
    await expect(page.getByText("Technical")).toBeHidden();
    await expect(page.getByText("Firestore: allow answerableAt")).toBeHidden();
  });

  test("blocks new questions while one is open", async ({ browser }) => {
    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");

    await sendRadarToHiders(hostPage);
    await expect(hostPage.getByRole("button", { name: "Matching" })).toBeDisabled();
    await expect(hostPage.getByRole("button", { name: "Radar" })).toBeDisabled();

    await cleanup();
  });

  test("tentacle wizard requires category before advancing", async ({
    localMap,
  }) => {
    await localMap.getByRole("button", { name: "Tentacles" }).click();
    await localMap.locator(".map-crosshair").waitFor({ state: "visible" });
    await clickMapCenter(localMap);
    await expect(localMap.getByRole("button", { name: "Next" })).toBeEnabled({
      timeout: 15_000,
    });
    await localMap.getByRole("button", { name: "Next" }).click();
    await expect(localMap.locator("select.field-input")).toBeVisible();
    await expect(localMap.getByRole("button", { name: "Next" })).toBeDisabled();
    await localMap.locator("select.field-input").selectOption("museum");
    await expect(localMap.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  test("end game requires hider acceptance", async ({ browser }) => {
    test.setTimeout(120_000);

    const { hostPage, guestPage, cleanup } =
      await createMultiplayerContexts(browser);

    const { code } = await createHostSession(hostPage);
    await joinAsRole(guestPage, code, "hider");
    await confirmInitialHidingZoneAtStation(guestPage, "Dublin Central");

    await hostPage.getByRole("button", { name: "Start" }).click();
    await dismissMapOnboarding(hostPage);

    hostPage.once("dialog", (dialog) => dialog.accept());
    await clickOverflowToolButton(hostPage, "Start end game");

    await expect(
      hostPage.getByText("Waiting for hider to accept end game"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      guestPage.getByText("Seekers requested end game"),
    ).toBeVisible({ timeout: 15_000 });

    await guestPage.getByRole("button", { name: "Accept" }).click();

    await expect(hostPage.getByText("End game started")).toBeVisible({
      timeout: 15_000,
    });
    await expect(guestPage.getByText("End game started")).toBeVisible({
      timeout: 15_000,
    });

    await cleanup();
  });
});
