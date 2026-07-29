import { clearActiveRevealTransition } from "../../navigation/revealRouteTransition";
import { isIosStandalonePwa } from "./pwa/isIosStandalonePwa";
import { isStandalonePwa } from "./pwa/isStandalonePwa";

export const RESUME_FALLBACK_CLASSES = [
  "jl-route-fallback-enter-forward",
  "jl-route-fallback-enter-back",
  "jl-route-fallback-enter-neutral",
] as const;

const ADMIN_BUDGET_CAP_MS = 6000;

function isAdminPathname(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function baseResumeWatchdogBudgets(): { graceMs: number; budgetMs: number } {
  if (isIosStandalonePwa()) {
    return { graceMs: 400, budgetMs: 1500 };
  }
  if (isStandalonePwa()) {
    return { graceMs: 500, budgetMs: 2000 };
  }
  return { graceMs: 800, budgetMs: 3000 };
}

export function clearResumeVisualArtifacts(): void {
  clearActiveRevealTransition();
  const root = document.getElementById("root");
  root?.classList.remove(...RESUME_FALLBACK_CLASSES);
}

export function rootHasInteractiveShell(
  root: HTMLElement | null = document.getElementById("root"),
): boolean {
  if (!root) {
    return false;
  }
  return Boolean(
    root.querySelector(
      'button, a[href], [role="button"], input, select, textarea, [aria-busy="true"]',
    ),
  );
}

export function rootHasResumeReady(
  root: HTMLElement | null = document.getElementById("root"),
): boolean {
  if (!root) {
    return false;
  }
  return Boolean(root.querySelector('[data-resume-ready="true"]'));
}

export function resumeWatchdogBudgets(pathname: string = ""): {
  graceMs: number;
  budgetMs: number;
} {
  const base = baseResumeWatchdogBudgets();
  if (!isAdminPathname(pathname)) {
    return base;
  }
  return {
    graceMs: Math.ceil(base.graceMs * 1.5),
    budgetMs: Math.min(base.budgetMs * 2, ADMIN_BUDGET_CAP_MS),
  };
}
