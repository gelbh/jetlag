import {
  test,
  expect,
  openMapWithLocalSession,
  openSettings,
  closePanel,
  MAP_CONTAINER_SELECTOR,
} from "../../fixtures";

test.describe("settings", () => {
  /**
   * Program Verify #4 (sheet dismiss → map pointers): Escape/closePanel path
   * (mobile Settings has no Close button). Device checklist (PR / human):
   * iPhone PWA grabber flick; Ask mapInteractive grabber dismiss; Accessibility
   * reduced-motion sheet open/close.
   */
  test("closes settings and restores map pointer hit target", async ({
    page,
  }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);

    const settings = page.getByRole("dialog", { name: "Settings" });
    await expect(settings).toBeVisible();
    await closePanel(page);
    await expect(settings).toBeHidden();

    await expect(
      page.locator(
        ".mantine-Drawer-overlay, .mantine-Modal-overlay, [data-mantine-overlay]",
      ),
    ).toHaveCount(0);

    const mapHit = await page.evaluate((sel) => {
      const canvas = document.querySelector(`${sel} canvas`);
      if (!(canvas instanceof HTMLElement)) {
        return { ok: false as const, reason: "no-canvas" };
      }
      const rect = canvas.getBoundingClientRect();
      // Upper map: above dock/sheet zone so dock chrome does not steal the point.
      const x = rect.left + rect.width * 0.5;
      const y = rect.top + rect.height * 0.28;
      const el = document.elementFromPoint(x, y);
      const blockedByOverlay = Boolean(
        document.querySelector(
          ".mantine-Drawer-overlay, .mantine-Modal-overlay, [data-mantine-overlay]",
        ),
      );
      const inMap =
        el instanceof Element &&
        Boolean(el.closest(sel) || el.closest("canvas"));
      return { ok: inMap && !blockedByOverlay, blockedByOverlay, inMap };
    }, MAP_CONTAINER_SELECTOR);

    expect(mapHit).toMatchObject({ ok: true, blockedByOverlay: false });
  });

  test("toggles satellite basemap and transit layer visibility", async ({
    page,
  }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);

    const settingsPanel = page.getByRole("tabpanel");
    // Low power lives under Session → Device & alerts (map essentials split).
    await page.getByRole("tab", { name: "Session" }).click();
    await settingsPanel
      .getByRole("button", { name: "Device & alerts" })
      .click();
    const lowPowerToggle = settingsPanel.getByLabel("Low power mode");
    await expect(lowPowerToggle).toBeChecked();
    await lowPowerToggle.click();
    await page.getByRole("tab", { name: "Map" }).click();
    await settingsPanel.getByRole("button", { name: "Satellite" }).click();
    await page.getByRole("tab", { name: "Layers" }).click();
    await settingsPanel.getByLabel("Transit").click();
    await page.getByRole("button", { name: "Close" }).click();

    await openSettings(page);
    await expect(
      settingsPanel.getByRole("button", { name: "Satellite" }),
    ).toBeVisible();
  });

  test("switches distance units", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);

    const settingsPanel = page.getByRole("tabpanel");
    await page.getByRole("tab", { name: "Map" }).click();
    await settingsPanel.getByRole("button", { name: "Metric (km)" }).click();
    await page.getByRole("button", { name: "Close" }).click();

    await openSettings(page);
    await page.getByRole("tab", { name: "Map" }).click();
    await expect(
      settingsPanel.getByRole("button", { name: "Metric (km)" }),
    ).toBeVisible();
  });

  test("shows session code in session tab", async ({ page }) => {
    await openMapWithLocalSession(page, { code: "TEST" });
    await openSettings(page);
    await page.getByRole("tab", { name: "Session" }).click();
    await expect(page.locator(".jl-stamp-code").first()).toHaveText("TEST");
  });

  test("toggles tool layer visibility", async ({ page }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await page.getByRole("tab", { name: "Layers" }).click();

    const settingsPanel = page.getByRole("tabpanel");
    const radarToggle = settingsPanel.getByLabel("Radar");
    await radarToggle.click();
    await page.getByRole("button", { name: "Close" }).click();

    await openSettings(page);
    await page.getByRole("tab", { name: "Layers" }).click();
    await expect(settingsPanel.getByLabel("Radar")).not.toBeChecked();
  });

  test("export map button is available in session settings", async ({
    page,
  }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await page.getByRole("tab", { name: "Session" }).click();
    await expect(
      page.getByRole("button", { name: "Export map" }),
    ).toBeVisible();
  });
});
