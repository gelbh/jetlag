import type { Page } from "@playwright/test";
import {
  assertEntryAxe,
  assertInViewport,
  assertMapChromeAxe,
  assertMinTapTargets,
  assertNoHorizontalOverflow,
  assertNoSeriousAxeViolations,
  expect,
  expectCreatePageMapPreviewLoaded,
  expectCreatePlaceSelected,
  goToCreatePlayStep,
  openMapWithLocalSession,
  openPlayHub,
  openSocialRoute,
  prepareE2EPage,
  SOCIAL_LAYOUT_PATHS,
  type SocialLayoutPath,
  socialRouteViewportLocator,
  test,
} from "../../fixtures";

async function settleHome(page: Page) {
  await prepareE2EPage(page);
  await page.goto("/");
  await openPlayHub(page);
  await expect(page.getByRole("link", { name: "Join session" })).toBeVisible();
}

async function assertLayoutSmoke(page: Page, options?: { exclude?: string[] }) {
  await assertNoHorizontalOverflow(page);
  await assertNoSeriousAxeViolations(page, options);
}

async function assertSocialLayoutSmoke(page: Page, path: SocialLayoutPath) {
  await openSocialRoute(page, path);
  await assertNoHorizontalOverflow(page);
  const viewportTarget = socialRouteViewportLocator(page, path);
  await assertInViewport(viewportTarget);
  if (path === "/friends" || path === "/leaderboard") {
    await assertMinTapTargets(viewportTarget);
  }
  // /stats SegmentedControl is sticky chrome but shorter than 44px HIG.
  await assertNoSeriousAxeViolations(page);
}

async function assertCreateAreaReady(page: Page) {
  await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
  await page.getByRole("button", { name: "Find place" }).click();
  await expectCreatePlaceSelected(page);
  await expectCreatePageMapPreviewLoaded(page);
}

test.describe("layout regression @ default mobile", () => {
  test("@smoke home has no overflow and meets tap targets", async ({ page }) => {
    await settleHome(page);
    await assertMinTapTargets(page.getByRole("link", { name: /Join session|Create session/i }));
    await assertLayoutSmoke(page);
  });

  test("@smoke join has no overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/join");
    await expect(page.getByLabel("Session code")).toBeVisible();
    await assertLayoutSmoke(page);
  });

  test("@smoke create HUD has no overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await assertCreateAreaReady(page);
    await expect(page.getByRole("combobox", { name: /game preset/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create game" })).toHaveCount(0);
    await assertLayoutSmoke(page);
  });

  test("@smoke create setup sheet scrolls with pinned confirm", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await assertCreateAreaReady(page);
    await goToCreatePlayStep(page);

    const confirm = page.getByRole("button", { name: "Create game" });
    await expect(confirm).toBeVisible();
    // MobileSheet split layout: scroll body vs pinned footer (single-path chrome).
    await expect(page.locator(".jl-create-session .hud-sheet")).toHaveCount(1);

    const relation = await page.evaluate(() => {
      const root = document.querySelector(".jl-create-session");
      const scroll = root?.querySelector(".hud-sheet .jl-scroll");
      const button = Array.from(root?.querySelectorAll("button") ?? []).find(
        (el) => el.textContent?.trim() === "Create game",
      );
      if (!(scroll instanceof HTMLElement) || !(button instanceof HTMLElement)) {
        return { ok: false as const, reason: "missing nodes" };
      }

      // Form content's nearest overflow-y-auto ancestor must be the sheet
      // scroller (fails if a nested overflow-y-auto returns).
      const formMarker = root.querySelector('[aria-label="Game size"]');
      if (!(formMarker instanceof HTMLElement)) {
        return { ok: false as const, reason: "missing form marker" };
      }
      const hasOverflowYAuto = (el: Element) =>
        el.className
          .toString()
          .split(/\s+/)
          .some((c) => c.includes("overflow-y-auto"));
      let nearestOverflow: Element | null = null;
      let formPathOverflowCount = 0;
      for (
        let node: Element | null = formMarker;
        node && node !== root;
        node = node.parentElement
      ) {
        if (hasOverflowYAuto(node)) {
          formPathOverflowCount += 1;
          if (!nearestOverflow) nearestOverflow = node;
        }
      }
      const formScrollOwnerIsSheet = nearestOverflow === scroll;
      const singleFormScrollport = formPathOverflowCount === 1;

      const spacer = document.createElement("div");
      spacer.style.height = "800px";
      scroll.appendChild(spacer);
      const before = scroll.scrollTop;
      scroll.scrollTop = before + 160;
      const moved = scroll.scrollTop > before;
      const footerOutside = !scroll.contains(button);
      spacer.remove();
      return {
        ok: true as const,
        footerOutside,
        moved,
        formScrollOwnerIsSheet,
        singleFormScrollport,
      };
    });

    expect(relation).toEqual(
      expect.objectContaining({
        ok: true,
        footerOutside: true,
        moved: true,
        formScrollOwnerIsSheet: true,
        singleFormScrollport: true,
      }),
    );

    await assertLayoutSmoke(page);
  });

  test("@smoke map dock chrome stays in viewport", async ({ page }) => {
    await openMapWithLocalSession(page);

    await test.step("single-path Mantine map chrome is present", async () => {
      await expect(page.locator(".map-chrome-hud")).toBeVisible();
      await expect(page.locator(".jl-map-bottom-chrome-host")).toBeVisible();
      await expect(page.locator('[data-island="hunt"]')).toBeVisible();
      await expect(page.locator('[data-island="session"]')).toBeVisible();
      await expect(page.locator('[data-island="history-start"]')).toHaveCount(0);
      await expect(page.locator('[data-island="history-end"]')).toHaveCount(0);
    });

    await test.step("hunt and session tool slots stay in viewport", async () => {
      const host = page.locator(".jl-map-bottom-chrome-host");
      const hunt = page.locator('[data-island="hunt"]');
      const session = page.locator('[data-island="session"]');
      await expect(hunt.getByRole("button", { name: "Undo last annotation" })).toBeVisible();
      await expect(session.getByRole("button", { name: "Draw on map" })).toBeVisible();
      await assertInViewport(host);
      await assertInViewport(hunt);
      await assertInViewport(session);
      // Session island lives in the right-stack, not the bottom band.
      await expect(page.locator(".jl-map-chrome-bottom-band")).toHaveCount(1);
      await expect(page.getByTestId("map-side-dock-stack")).toHaveCount(1);
      await expect(
        page.getByTestId("map-side-dock-stack").locator("[data-island='session']"),
      ).toHaveCount(1);
      // Side-stack slots: 2.75rem = 44px; borders may measure slightly under.
      await assertMinTapTargets(session.getByRole("button", { name: "Open settings" }), 40);
    });

    // Leaflet markers + closed Mantine Drawer shells trip axe; chrome-only.
    await assertLayoutSmoke(page, {
      exclude: [".maplibregl-map", ".mantine-Drawer-root"],
    });
  });

  test("@smoke map chrome axe includes color-contrast", async ({ page }) => {
    await openMapWithLocalSession(page);
    await expect(page.locator(".map-chrome-hud")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertMapChromeAxe(page);
  });

  test("@smoke home axe includes color-contrast", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Create session" })).toBeVisible();
    await expect(page.locator("main.home-poster-viewport, main.home-poster").first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertEntryAxe(page);
  });

  test("@smoke leaderboard board sheet opens", async ({ page }) => {
    await openSocialRoute(page, "/leaderboard");
    await page.getByRole("button", { name: /Choose board/i }).click();
    // Mantine Drawer title is visual text; accessible name is often empty.
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Choose board", { exact: true })).toBeVisible();
  });

  for (const path of SOCIAL_LAYOUT_PATHS) {
    test(`@smoke ${path.slice(1)} has no overflow and chrome stays in viewport`, async ({
      page,
    }) => {
      await assertSocialLayoutSmoke(page, path);
    });
  }
});

test.describe("layout regression @ 320px", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("@smoke home reflows at 320 without overflow", async ({ page }) => {
    await settleHome(page);
    await assertLayoutSmoke(page);
  });

  test("@smoke join reflows at 320 without overflow", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/join");
    await expect(page.getByLabel("Session code")).toBeVisible();
    await assertLayoutSmoke(page);
  });
});
