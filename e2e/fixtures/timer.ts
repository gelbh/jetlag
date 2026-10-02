import { expect, type Page } from "@playwright/test";
import { dismissMapOnboarding } from "./page-init";

export function parseClockToSeconds(text: string): number {
  const parts = text
    .trim()
    .split(":")
    .map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Could not parse timer text: ${text}`);
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  throw new Error(`Unexpected timer format: ${text}`);
}

/** Tip MapTimerCluster primary readout (view-only; not a button). */
export function sessionElapsedLocator(page: Page) {
  return page.getByTitle("Session time since start");
}

export async function readSessionElapsedSeconds(page: Page): Promise<number> {
  const elapsed = sessionElapsedLocator(page);
  await expect(elapsed).toBeVisible({ timeout: 15_000 });
  const text = (await elapsed.textContent()) ?? "";
  return parseClockToSeconds(text);
}

export async function waitForSessionElapsedAtLeast(
  page: Page,
  minSeconds: number,
  options?: { timeout?: number },
): Promise<number> {
  let elapsed = 0;
  await expect(async () => {
    elapsed = await readSessionElapsedSeconds(page);
    expect(elapsed).toBeGreaterThanOrEqual(minSeconds);
  }).toPass({ timeout: options?.timeout ?? 15_000 });
  return elapsed;
}

export async function startSessionTimer(page: Page) {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(sessionElapsedLocator(page)).toBeVisible({ timeout: 15_000 });
}

export async function goHomeFromMap(page: Page) {
  // Full navigation matches session lifecycle e2e and avoids races with
  // deferred chunk-reload recovery after leaving an active map session.
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Return to map/i })).toBeVisible({
    timeout: 30_000,
  });
}

export async function returnToMapFromHome(page: Page) {
  await page.getByRole("button", { name: /Return to map/i }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
  await dismissMapOnboarding(page);
}

/** Tip status island exposes Pause/Resume inline (no timer-settings menu). */
export async function pauseSessionTimer(page: Page) {
  await page.getByRole("button", { name: "Pause timer" }).click();
  await expect(page.getByRole("button", { name: "Resume timer" })).toBeVisible();
}

/** @deprecated Prefer pauseSessionTimer; tip chrome has no separate settings open. */
export async function openTimerSettings(page: Page) {
  await pauseSessionTimer(page);
}
