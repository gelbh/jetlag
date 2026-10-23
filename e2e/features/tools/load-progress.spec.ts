import type { Page, Route } from "@playwright/test";
import { clickToolDockButton, expect, expectAskHud, pickCatalogRow, test } from "../../fixtures";

const OVERPASS_URL = /overpass-api\.de|maps\.mail\.ru|overpass\.kumi\.systems|\/interpreter/;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function delayOverpass(page: Page, ms: number): Promise<void> {
  await page.route(OVERPASS_URL, async (route: Route) => {
    await delay(ms);
    // The page may have cancelled the request while it waited.
    await route.fallback().catch(() => undefined);
  });
}

async function askMatchingMuseum(page: Page): Promise<void> {
  // Without the bundled pack POIs the search has to wait on Overpass.
  await page.route(/\/geo\/[^/]+\/poi\//, (route) => route.fulfill({ status: 404, body: "" }));
  await clickToolDockButton(page, "Matching");
  await expectAskHud(page);
  // Map-first places the anchor from GPS on its own; placeAskAnchor would wait for the result.
  await pickCatalogRow(page, /Museum/i);
}

function progressBar(page: Page) {
  return page.getByTestId("load-progress").getByRole("progressbar").first();
}

async function readPercent(page: Page): Promise<number | null> {
  const value = await progressBar(page)
    .getAttribute("aria-valuenow", { timeout: 200 })
    .catch(() => null);
  return value === null ? null : Number(value);
}

test.describe("load progress", () => {
  test("matching search shows an advancing bar, then the result", async ({ localMap: page }) => {
    await delayOverpass(page, 4_000);
    await askMatchingMuseum(page);

    await expect(progressBar(page)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("load-progress").getByText(/Searching map data/)).toBeVisible();
    const first = (await readPercent(page)) ?? 0;
    await expect.poll(async () => (await readPercent(page)) ?? 100).toBeGreaterThan(first);

    await expect(page.getByTestId("load-progress")).toHaveCount(0, { timeout: 30_000 });
  });

  test("Cancel stops the search and returns to the category step", async ({ localMap: page }) => {
    await delayOverpass(page, 30_000);
    await askMatchingMuseum(page);

    await expect(progressBar(page)).toBeVisible({ timeout: 10_000 });
    // Cancel must abort the network request itself, which frees its Overpass slot.
    const aborted = page.waitForEvent("requestfailed", {
      predicate: (request) => OVERPASS_URL.test(request.url()),
      timeout: 5_000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();
    await aborted;

    await expect(page.getByTestId("load-progress")).toHaveCount(0, { timeout: 5_000 });
    await expect(page.getByText(/didn't load|Couldn't resolve/i)).toHaveCount(0);
    // Back on the category step: catalog rows are buttons again.
    await expect(page.getByRole("button", { name: /Museum/i }).first()).toBeVisible();
  });

  test("a split query never moves the bar backwards", async ({ localMap: page }) => {
    let first = true;
    await page.route(OVERPASS_URL, async (route: Route) => {
      if (first) {
        first = false;
        await delay(1_500);
        await route.fulfill({ status: 504, body: "" });
        return;
      }
      await delay(500);
      await route.fallback().catch(() => undefined);
    });
    await askMatchingMuseum(page);

    await expect(progressBar(page)).toBeVisible({ timeout: 10_000 });
    const samples: number[] = [];
    while ((await page.getByTestId("load-progress").count()) > 0 && samples.length < 300) {
      const percent = await readPercent(page);
      if (percent !== null) {
        samples.push(percent);
      }
      await delay(100);
    }

    expect(samples.length).toBeGreaterThan(3);
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1]);
    }
  });
});
