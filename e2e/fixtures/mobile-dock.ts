import { type Page } from "@playwright/test";

export interface ToolDockOverflowMetrics {
  barRight: number;
  viewportWidth: number;
  overflowSlots: number;
}

export async function readToolDockOverflowMetrics(
  page: Page,
): Promise<ToolDockOverflowMetrics> {
  return page.evaluate(() => {
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
}

export async function injectSimulatedSafeAreaBottom(
  page: Page,
  safeBottomPx: number,
) {
  await page.evaluate((bottomPx) => {
    document.documentElement.style.setProperty(
      "--safe-area-bottom",
      `${bottomPx}px`,
    );
  }, safeBottomPx);
}

export const SIMULATED_SAFE_AREA_BOTTOM_PX = 34;
