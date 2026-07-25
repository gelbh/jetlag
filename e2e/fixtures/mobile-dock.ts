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

export async function injectSimulatedSafeAreaTop(
  page: Page,
  safeTopPx: number,
) {
  await page.evaluate((topPx) => {
    const root = document.documentElement;
    root.style.setProperty("--safe-area-top", `${topPx}px`);
    // Mirror env(safe-area-inset-top) for components/CSS that read the env() directly.
    root.style.paddingTop = "0px";
    const sheet = document.getElementById("jl-e2e-safe-area-top");
    const css = `:root { --jl-e2e-safe-top: ${topPx}px; }
.jl-status-rail { padding-top: ${topPx}px !important; }
.map-screen-shell::before { height: ${topPx}px !important; }`;
    if (sheet) {
      sheet.textContent = css;
      return;
    }
    const el = document.createElement("style");
    el.id = "jl-e2e-safe-area-top";
    el.textContent = css;
    document.head.appendChild(el);
  }, safeTopPx);
}

export const SIMULATED_SAFE_AREA_BOTTOM_PX = 34;
export const SIMULATED_SAFE_AREA_TOP_PX = 59;
