import type { Page } from "@playwright/test";
import {
  test,
  expect,
  prepareE2EPage,
  seedLocalSession,
} from "../fixtures";

/**
 * Prod Worker serves exact `/` from dist/prerender/home/ and `/join` from dist/join/; plain
 * `vite preview` serves the SPA shell for both, so map the document request the same way.
 */
const PRERENDERED_DOCUMENTS: Record<string, string> = {
  "/": "/prerender/home/index.html",
  "/join": "/join/index.html",
};

async function servePrerenderedDocuments(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname in PRERENDERED_DOCUMENTS,
    async (route) => {
      if (route.request().resourceType() !== "document") {
        await route.fallback();
        return;
      }
      const url = new URL(route.request().url());
      url.pathname = PRERENDERED_DOCUMENTS[url.pathname]!;
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    },
  );
}

/** Root children removed after load = React threw the prerendered DOM away. */
async function watchHydrationSignals(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __rootReplaced: number };
    w.__cls = 0;
    w.__rootReplaced = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEntry[] & {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    document.addEventListener("DOMContentLoaded", () => {
      const root = document.getElementById("root");
      if (!root) return;
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) w.__rootReplaced += 1;
          }
        }
      }).observe(root, { childList: true });
    });
  });
}

async function openPrerendered(page: Page, path: string): Promise<void> {
  await watchHydrationSignals(page);
  await servePrerenderedDocuments(page);
  await page.goto(path);
  const prerendered = await page
    .locator("#root")
    .getAttribute("data-prerendered");
  // eslint-disable-next-line playwright/no-skipped-test -- `npm run dev` has no prerendered output; CI runs on `npm run build`.
  test.skip(prerendered !== "true", "No prerendered build output (dev server)");
}

async function expectCleanHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof window.__JETLAG_E2E__?.recoverableErrorCount === "function",
  );
  const signals = await page.evaluate(() => {
    const w = window as unknown as { __cls: number; __rootReplaced: number };
    return {
      recoverableErrors: window.__JETLAG_E2E__!.recoverableErrorCount(),
      rootReplaced: w.__rootReplaced,
      cls: w.__cls,
    };
  });
  expect(signals.recoverableErrors).toBe(0);
  expect(signals.rootReplaced).toBe(0);
  expect(signals.cls).toBeLessThan(0.01);
}

test("@smoke prerendered home hydrates without recoverable errors", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await openPrerendered(page, "/");

  // Client-side navigation only works once hydration attached React's handlers.
  const documents: string[] = [];
  page.on("request", (request) => {
    // Main frame only: Firebase Auth loads its own iframe document.
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documents.push(request.url());
    }
  });
  await page.getByRole("link", { name: "Join session" }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(
    page.getByRole("button", { name: "Join session" }),
  ).toBeVisible();
  expect(documents).toEqual([]);

  await expectCleanHydration(page);
});

test("@smoke prerendered join hydrates without recoverable errors", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await openPrerendered(page, "/join");

  const hider = page
    .getByRole("radiogroup", { name: "Player side" })
    .locator("label")
    .filter({ hasText: /^Hider$/ });
  await hider.click();
  await expect(
    page.getByRole("radiogroup", { name: "Player side" }).getByRole("radio", {
      name: "Hider",
    }),
  ).toBeChecked();

  await expectCleanHydration(page);
});

test("@smoke prerendered home hydrates with a saved local session", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await seedLocalSession(page, { code: "ABCD" });
  await openPrerendered(page, "/");

  // Saved-session UI is client-only state; it must arrive after hydration, not break it.
  await expect(
    page.getByRole("button", { name: /Return to map/i }),
  ).toBeVisible();

  await expectCleanHydration(page);
});
