import { type Page, expect } from "@playwright/test";
import { dismissMapOnboarding } from "./page-init";

export function parseClockToSeconds(text: string): number {
  const parts = text.trim().split(":").map((part) => Number.parseInt(part, 10));
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

export async function readSessionElapsedSeconds(page: Page): Promise<number> {
  const sessionButton = page.getByRole("button", {
    name: /Session elapsed|Seek phase time/i,
  });
  await expect(sessionButton).toBeVisible({ timeout: 15_000 });
  const text =
    (await sessionButton.locator(".jl-ticker-value").textContent()) ?? "";
  return parseClockToSeconds(text);
}

export async function startSessionTimer(page: Page) {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(
    page.getByRole("button", { name: /Session elapsed|Seek phase time/i }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function goHomeFromMap(page: Page) {
  // Full navigation matches session lifecycle e2e and avoids races with
  // deferred chunk-reload recovery after leaving an active map session.
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Return to map/i }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function returnToMapFromHome(page: Page) {
  await page.getByRole("button", { name: /Return to map/i }).click();
  await expect(page).toHaveURL(/\/map/, { timeout: 15_000 });
  await dismissMapOnboarding(page);
}

export async function openTimerSettings(page: Page) {
  await page
    .getByRole("button", { name: /Seek phase time|Session elapsed/i })
    .click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
}
