import type { Page } from "@playwright/test";
import { test, expect, prepareE2EPage, seedLocalSession } from "../fixtures";

/**
 * Prod Worker serves exact `/` from dist/prerender/home/ and `/join` from dist/join/; plain
 * `vite preview` serves the SPA shell for both, so map the document request the same way.
 */
const PRERENDERED_DOCUMENTS: Record<string, string> = {
  "/": "/prerender/home/index.html",
  "/join": "/join/index.html",
  "/premium": "/premium/index.html",
  "/privacy": "/privacy/index.html",
  "/terms": "/terms/index.html",
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

/** Probe state written by the init script below. */
type HydrationProbeWindow = Window & {
  __cls: number;
  __prerenderedNodes: Element[];
};

/** Records CLS and every prerendered `#root` element before any app script runs. */
async function watchHydrationSignals(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as HydrationProbeWindow;
    w.__cls = 0;
    w.__prerenderedNodes = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEntry[] &
        {
          value: number;
          hadRecentInput: boolean;
        }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    document.addEventListener("DOMContentLoaded", () => {
      w.__prerenderedNodes = [...document.querySelectorAll("#root *")];
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

/**
 * Call before navigating away. `keepsPrerenderedNodes: false` for pages whose client-only state
 * (a saved session) legitimately swaps prerendered UI right after hydration.
 */
async function expectCleanHydration(
  page: Page,
  { keepsPrerenderedNodes = true } = {},
): Promise<void> {
  // App's layout effect sets this after the hydration commit (the snapshot no longer carries it).
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.bootComplete === "true" &&
      typeof window.__JETLAG_E2E__?.recoverableErrorCount === "function",
  );
  const signals = await page.evaluate(() => {
    const w = window as unknown as HydrationProbeWindow;
    return {
      recoverableErrors: window.__JETLAG_E2E__!.recoverableErrorCount(),
      prerendered: w.__prerenderedNodes.length,
      discarded: w.__prerenderedNodes.filter((node) => !node.isConnected)
        .length,
      cls: w.__cls,
    };
  });
  expect(signals.prerendered).toBeGreaterThan(0);
  expect(signals.recoverableErrors).toBe(0);
  if (keepsPrerenderedNodes) {
    expect(signals.discarded).toBe(0);
  }
  expect(signals.cls).toBeLessThan(0.01);
}

test("@smoke prerendered home hydrates without recoverable errors", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await openPrerendered(page, "/");
  await expectCleanHydration(page);

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
});

test("@smoke prerendered join hydrates without recoverable errors", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await openPrerendered(page, "/join");
  await expectCleanHydration(page);

  // Run after the App mount: clicks before the app boots are not replayed. Hider is the
  // default; a native label click checks the radio even without React, but Mantine's
  // `data-active` only moves once the route boundary has hydrated.
  const seeker = page
    .getByRole("radiogroup", { name: "Player side" })
    .locator("label")
    .filter({ hasText: /^Seeker$/ });
  await seeker.click();
  await expect(seeker).toHaveAttribute("data-active", "true");
});

test("@smoke prerendered join fills the invite code after hydrating", async ({
  page,
}) => {
  await prepareE2EPage(page);
  await openPrerendered(page, "/join?code=ABCD");

  await expect(page.getByPlaceholder("ABCD")).toHaveValue("ABCD");
  await expectCleanHydration(page);
});

for (const path of ["/premium", "/privacy", "/terms"]) {
  test(`@smoke prerendered ${path} hydrates without recoverable errors`, async ({
    page,
  }) => {
    await prepareE2EPage(page);
    await openPrerendered(page, path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectCleanHydration(page);
  });
}

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

  await expectCleanHydration(page, { keepsPrerenderedNodes: false });
});
