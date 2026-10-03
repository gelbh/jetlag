import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readCss(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("phone-shell L/R safe-area compose", () => {
  it("defines letterbox-composed L/R tokens on the phone shell", () => {
    const css = readCss("src/styles/base.css");
    expect(css).toMatch(
      /\[data-player-phone-shell\]\s*\{[^}]*--jl-shell-letterbox-x:\s*max\(0px,\s*\(100vw - 100%\) \/ 2\)/s,
    );
    expect(css).toMatch(
      /--jl-shell-safe-left:\s*max\(\s*0px,\s*env\(safe-area-inset-left,\s*0px\)\s*-\s*var\(--jl-shell-letterbox-x\)\s*\)/s,
    );
    expect(css).toMatch(
      /--jl-shell-safe-right:\s*max\(\s*0px,\s*env\(safe-area-inset-right,\s*0px\)\s*-\s*var\(--jl-shell-letterbox-x\)\s*\)/s,
    );
    // Sync beacon under shell uses composed L/R (not raw viewport env alone).
    expect(css).toMatch(
      /\[data-player-phone-shell\]\s*\{[^}]*--jl-sync-beacon-inset:\s*max\(0\.625rem,\s*var\(--jl-shell-safe-right\)\)/s,
    );
    expect(css).toMatch(
      /\[data-player-phone-shell\]\s*\{[^}]*--jl-sync-beacon-inset-left:\s*max\(0\.625rem,\s*var\(--jl-shell-safe-left\)\)/s,
    );
  });

  it("status rail float prefers shell-composed L/R with env fallback", () => {
    const css = readCss("src/styles/map-shell.css");
    expect(css).toMatch(
      /\.jl-status-rail-float\s*\{[^}]*var\(--jl-shell-safe-right,\s*env\(safe-area-inset-right/s,
    );
    expect(css).toMatch(
      /\.jl-status-rail-float\s*\{[^}]*var\(--jl-shell-safe-left,\s*env\(safe-area-inset-left/s,
    );
  });

  it("documents compose semantics: letterbox zeroes excess; full-bleed keeps env", () => {
    // Formula: max(0, env - letterbox). When letterbox >= env → 0 (token floor wins
    // at the consumer). When letterbox = 0 (shell ≈ 100vw) → env.
    const letterboxPastNotch = Math.max(0, 47 - 202);
    const fullBleed = Math.max(0, 47 - 0);
    expect(letterboxPastNotch).toBe(0);
    expect(fullBleed).toBe(47);
  });
});
