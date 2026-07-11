import { type Page, expect } from "@playwright/test";
import { expectMapHasAnnotations } from "../map";

export type TutorialCaptureReadyKind =
  | "hiders-send"
  | "map-context"
  | "map-result"
  | "photo-context"
  | "photo-result";

export async function assertNoPanelError(page: Page) {
  const error = page.locator(".hud-panel .text-status-error");
  await expect(error).toHaveCount(0);
}

export async function assertTutorialCaptureReady(
  page: Page,
  kind: TutorialCaptureReadyKind,
) {
  switch (kind) {
    case "hiders-send":
      await assertNoPanelError(page);
      await expect(
        page.getByRole("button", { name: /^Send to hiders \(D\d+P\d+\)$/ }),
      ).toBeEnabled({ timeout: 60_000 });
      return;

    case "map-context":
    case "map-result":
      await expectMapHasAnnotations(page);
      await expect
        .poll(
          async () =>
            page.locator(".leaflet-overlay-pane path").count(),
          { timeout: 15_000 },
        )
        .toBeGreaterThan(0);
      return;

    case "photo-context":
      await expect(
        page.getByRole("button", { name: /unread chat/i }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByLabel("Chat tabs")).toHaveCount(0);
      return;

    case "photo-result":
      await expect(
        page.getByText(/cannot answer the question/i).first(),
      ).toBeVisible({ timeout: 30_000 });
      return;

    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unhandled capture ready kind: ${_exhaustive}`);
    }
  }
}
