import { isStandalonePwa } from "./isStandalonePwa";

/** Class paired with css-standalone height lock when matchMedia alone misses iOS. */
export const STANDALONE_SHELL_CLASS = "jl-standalone-shell";

/**
 * iOS home-screen can set navigator.standalone without (display-mode: standalone).
 * CSS @media alone misses that case; stamp html so vh/lvh rules still apply (W5-G).
 */
export function markStandaloneShellClass(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (!isStandalonePwa()) {
    return;
  }
  document.documentElement.classList.add(STANDALONE_SHELL_CLASS);
}
