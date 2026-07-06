import { test, expect } from "./fixtures";
import { openMapWithLocalSession, placePin } from "./fixtures";

test.describe("mobile tool dock", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
  });

  test("hides undo in the dock and exposes it in the overflow sheet", async ({
    page,
  }) => {
    const historyGroup = page.getByLabel("History");
    await expect(historyGroup).toBeHidden();

    await page.getByRole("button", { name: "More tools" }).click();
    const sheet = page.getByRole("dialog", { name: "More tools" });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: "Undo last annotation" }),
    ).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Redo last annotation" })).toBeVisible();
    await expect(sheet.getByText("Draw a play boundary")).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Open settings" })).toBeVisible();
  });

  test("dock fits without clipping question tools", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const bar = document.querySelector(".jl-tool-dock-bar");
      const barRect = bar?.getBoundingClientRect();
      const slots = [...document.querySelectorAll(".jl-tool-slot")].filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      return {
        barRight: barRect?.right ?? 0,
        viewportWidth: window.innerWidth,
        overflowSlots: slots.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.right > (barRect?.right ?? 0) + 1;
        }).length,
      };
    });

    expect(metrics.overflowSlots).toBe(0);
    expect(metrics.barRight).toBeLessThanOrEqual(metrics.viewportWidth);
  });

  test("matches compact dock screenshots", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveScreenshot(
      "tool-dock-compact-closed.png",
    );

    await page.getByRole("button", { name: "More tools" }).click();
    await expect(page.getByRole("dialog", { name: "More tools" })).toHaveScreenshot(
      "tool-overflow-sheet-open.png",
    );
  });

  test("supports undo from the overflow sheet after placing a pin", async ({
    page,
  }) => {
    await placePin(page);
    await page.getByRole("button", { name: "More tools" }).click();
    await page
      .getByRole("dialog", { name: "More tools" })
      .getByRole("button", { name: "Undo last annotation" })
      .click();

    await page.getByRole("button", { name: "More tools" }).click();
    await expect(
      page
        .getByRole("dialog", { name: "More tools" })
        .getByRole("button", { name: "Redo last annotation" }),
    ).toBeEnabled();
  });
});
