import fs from "node:fs";
import path from "node:path";
import { type Page, expect } from "@playwright/test";
import { expectMapHasAnnotations, waitForMapTilesLoaded } from "./map";
import {
  openMapWithLocalSession,
  type LocalSessionSeedOptions,
} from "./session";

import fs from "node:fs";
import path from "node:path";
import { type Page, expect } from "@playwright/test";
import { expectMapHasAnnotations, waitForMapTilesLoaded } from "./map";
import {
  openMapWithLocalSession,
  type LocalSessionSeedOptions,
} from "./session";

export async function openTutorialMapSession(
  page: Page,
  options: Omit<LocalSessionSeedOptions, "sessionId"> = {},
) {
  await openMapWithLocalSession(page, {
    ...options,
    sessionId: "local",
  });
}

export type QuestionCaptureRunner = (
  page: Page,
  rootDir: string,
) => Promise<void>;

export async function runQuestionCaptures(
  page: Page,
  rootDir: string,
  captures: ReadonlyArray<
    readonly [string, QuestionCaptureRunner, Omit<LocalSessionSeedOptions, "sessionId">?]
  >,
) {
  for (const [, captureFn, sessionOptions] of captures) {
    await openTutorialMapSession(page, sessionOptions ?? {});
    await waitForMapTilesLoaded(page);
    await captureFn(page, rootDir);
  }
}

export function tutorialQuestionAsset(
  rootDir: string,
  toolId: string,
  ...segments: string[]
) {
  const full = path.join(rootDir, "questions", toolId, ...segments);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  return full;
}

export async function captureTutorialViewport(page: Page, filePath: string) {
  await waitForMapTilesLoaded(page);
  await page.screenshot({
    path: filePath,
    animations: "disabled",
  });
}

export async function captureTutorialMapFocus(page: Page, filePath: string) {
  await expectMapHasAnnotations(page);
  await waitForMapTilesLoaded(page);

  const clip = await page.evaluate(() => {
    const mapRect = document
      .querySelector(".leaflet-container")
      ?.getBoundingClientRect();
    if (!mapRect) {
      return null;
    }

    const shapes = document.querySelectorAll(".leaflet-overlay-pane path");
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    shapes.forEach((shape) => {
      const rect = shape.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    if (!Number.isFinite(minX)) {
      return null;
    }

    const spanX = Math.max(maxX - minX, 48);
    const spanY = Math.max(maxY - minY, 48);
    const padX = spanX * 0.45 + 28;
    const padY = spanY * 0.45 + 28;

    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const width = Math.min(window.innerWidth - x, spanX + padX * 2);
    const height = Math.min(window.innerHeight - y, spanY + padY * 2);

    return { x, y, width, height };
  });

  if (clip) {
    await page.screenshot({
      path: filePath,
      clip,
      animations: "disabled",
    });
    return;
  }

  await captureTutorialViewport(page, filePath);
}

export async function captureToolDockStrip(page: Page, filePath: string) {
  await waitForMapTilesLoaded(page);
  const dock = page.getByLabel("Question tools");
  await expect(dock).toBeVisible({ timeout: 15_000 });
  await dock.screenshot({
    path: filePath,
    animations: "disabled",
  });
}
