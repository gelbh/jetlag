import type { Page } from "@playwright/test";
import {
  test,
  expect,
  prepareE2EPage,
  openPlayHub,
  openMapWithLocalSession,
  assertNoHorizontalOverflow,
  assertMinTapTargets,
  assertNoSeriousAxeViolations,
  expectCreatePageMapPreviewLoaded,
} from "../../fixtures";

async function settleHome(page: Page) {
  await prepareE2EPage(page);
  await page.goto("/");
  await openPlayHub(page);
  await expect(page.getByRole("link", { name: "Join session" })).toBeVisible();
}

test.describe("layout regression @ default mobile", () => {
  test("@smoke home has no overflow and meets tap targets", async ({
    page,
  }) => {
    await settleHome(page);
    await assertNoHorizontalOverflow(page);
    await assertMinTapTargets(
      page,
      page.getByRole("link", { name: /Join session|Create session/i }),
    );
    await assertNoSeriousAxeViolations(page);
  });

  test("@smoke join has no overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/join");
    await expect(
      page.getByRole("heading", { name: "Session code" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertNoSeriousAxeViolations(page);
  });

  test("@smoke create HUD has no overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
    await page.getByRole("button", { name: "Find place" }).click();
    await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expectCreatePageMapPreviewLoaded(page);
    await assertNoHorizontalOverflow(page);
    await assertNoSeriousAxeViolations(page);
  });

  test("@smoke map dock chrome stays in viewport", async ({ page }) => {
    await openMapWithLocalSession(page);
    await assertNoHorizontalOverflow(page);
    const more = page.getByRole("button", { name: "More tools" });
    await expect(more).toBeVisible();
    await assertMinTapTargets(page, more);
    await assertNoSeriousAxeViolations(page);
  });

  test("@smoke tutorial hub has no overflow", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "jetlag.tutorialProgress",
        JSON.stringify({
          core: 6,
          tools: -1,
          hider: -1,
          extras: -1,
          coreComplete: true,
          questions: {
            matching: 2,
            measuring: -1,
            thermometer: -1,
            radar: -1,
            tentacle: -1,
            photo: -1,
          },
        }),
      );
    });
    await prepareE2EPage(page);
    await page.goto("/tutorial");
    await expect(page.getByRole("heading", { name: "Tutorial" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertNoSeriousAxeViolations(page);
  });
});

test.describe("layout regression @ 320px", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("@smoke home reflows at 320 without overflow", async ({ page }) => {
    await settleHome(page);
    await assertNoHorizontalOverflow(page);
    await assertNoSeriousAxeViolations(page);
  });

  test("@smoke join reflows at 320 without overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/join");
    await expect(
      page.getByRole("heading", { name: "Session code" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertNoSeriousAxeViolations(page);
  });
});
