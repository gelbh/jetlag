import { type Page } from "@playwright/test";

export interface ToolDockOverflowMetrics {
  barRight: number;
  viewportWidth: number;
  overflowSlots: number;
}

export interface ToolDockVisibleLabelMetrics {
  text: string;
  display: string;
  slotHeight: number;
}

export async function readVisibleToolDockLabelMetrics(
  page: Page,
): Promise<ToolDockVisibleLabelMetrics[]> {
  return page.evaluate(() => {
    const labels = [
      ...document.querySelectorAll(".jl-tool-dock-bar .jl-tool-slot-label"),
    ];
    return labels
      .map((label) => {
        const slot = label.closest(".jl-tool-slot");
        const slotRect = slot?.getBoundingClientRect();
        if (!slotRect || slotRect.width <= 0) {
          return null;
        }
        return {
          text: label.textContent?.trim() ?? "",
          display: getComputedStyle(label).display,
          slotHeight: slotRect.height,
        };
      })
      .filter((entry): entry is ToolDockVisibleLabelMetrics => entry !== null);
  });
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
    const root = document.documentElement;
    root.style.setProperty("--safe-area-bottom", `${bottomPx}px`);
    // Mirror env(safe-area-inset-bottom) for wrapper chassis CSS that reads env() directly.
    const sheet = document.getElementById("jl-e2e-safe-area-bottom");
    const css = `:root { --jl-e2e-safe-bottom: ${bottomPx}px; }
.jl-tool-dock:not(.jl-tool-dock--rail) {
  padding-bottom: ${bottomPx}px !important;
}`;
    if (sheet) {
      sheet.textContent = css;
      return;
    }
    const el = document.createElement("style");
    el.id = "jl-e2e-safe-area-bottom";
    el.textContent = css;
    document.head.appendChild(el);
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
