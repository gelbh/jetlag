import { clearActiveRevealTransition } from "../../navigation/revealRouteTransition";
import { isIosStandalonePwa } from "./isIosStandalonePwa";
import { isStandalonePwa } from "./isStandalonePwa";

export const RESUME_FALLBACK_CLASSES = [
  "jl-route-fallback-enter-forward",
  "jl-route-fallback-enter-back",
  "jl-route-fallback-enter-neutral",
] as const;

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

export function resumeWatchdogBudgets(): { graceMs: number; budgetMs: number } {
  if (isIosStandalonePwa()) {
    return { graceMs: 400, budgetMs: 1500 };
  }
  if (isStandalonePwa()) {
    return { graceMs: 500, budgetMs: 2000 };
  }
  return { graceMs: 800, budgetMs: 3000 };
}
