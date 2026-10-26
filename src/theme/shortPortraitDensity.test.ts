import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

/** Brace-balanced slice starting at `openIndex` (must point at `{`). */
function balancedBlock(source: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  throw new Error("unbalanced CSS block starting at openIndex");
}

const SHORT_PORTRAIT_MEDIA =
  /@media\s*\(\s*height\s*<=\s*700px\s*\)\s*and\s*\(\s*orientation:\s*portrait\s*\)/g;

const CHROME_DENSITY_TOKENS = [
  "--status-bar-height",
  "--dock-float-gap",
  "--chrome-gap-above-dock",
  "--chrome-gap-bottom",
  "--chrome-side-stack-gap",
  "--chrome-side-stack-lift",
] as const;

const ENTRY_DENSITY_TOKENS = [
  "--entry-pad-y-viewport",
  "--entry-gap-viewport-center",
  "--entry-gap-viewport-start",
  "--entry-gap-viewport-between",
  "--entry-gap-flow-center",
  "--entry-top-breathing-extra",
  "--entry-top-extra",
] as const;

function shortPortraitBlockIn(source: string): string {
  const matches = [...source.matchAll(SHORT_PORTRAIT_MEDIA)];
  expect(matches).toHaveLength(1);
  const mediaMatch = matches[0];
  const braceIndex = source.indexOf("{", mediaMatch.index);
  expect(braceIndex).toBeGreaterThan(-1);
  return balancedBlock(source, braceIndex);
}

describe("short-portrait density CSS contract", () => {
  it("defines one short-portrait media in base.css that reassigns all chrome density tokens", () => {
    const baseCss = readSource("src/styles/base.css");
    const bottomChrome = readSource("src/styles/map-bottom-chrome.css");

    // Single breakpoint owner: base.css only (no duplicate short-portrait media elsewhere).
    expect(bottomChrome.match(SHORT_PORTRAIT_MEDIA)).toBeNull();

    const shortPortraitBlock = shortPortraitBlockIn(baseCss);

    for (const token of CHROME_DENSITY_TOKENS) {
      expect(shortPortraitBlock).toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it("reassigns entry density vars under the same short-portrait media", () => {
    const baseCss = readSource("src/styles/base.css");

    for (const token of ENTRY_DENSITY_TOKENS) {
      expect(baseCss).toMatch(new RegExp(`${token}\\s*:`));
    }

    const shortPortraitBlock = shortPortraitBlockIn(baseCss);

    for (const token of ENTRY_DENSITY_TOKENS) {
      expect(shortPortraitBlock).toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it("does not downscale phone-shell / root density via transform scale or zoom", () => {
    const baseCss = readSource("src/styles/base.css");
    const phoneShell = readSource("src/components/ui/layout/PlayerPhoneShell.tsx");

    // Density path only: base shell/root CSS and PlayerPhoneShell must not
    // introduce global downscale. Micro-interaction scales elsewhere are OK.
    expect(baseCss).not.toMatch(/\bzoom\s*:/);
    expect(baseCss).not.toMatch(/transform\s*:\s*[^;]*\bscale\s*\(/i);

    expect(phoneShell).not.toMatch(/\bzoom\s*:/);
    expect(phoneShell).not.toMatch(/scale\s*\(/i);
  });

  it("keeps landscape short side-stack and width-compact tool-slot rules", () => {
    const bottomChrome = readSource("src/styles/map-bottom-chrome.css");
    const toolDock = readSource("src/styles/map-tool-dock.css");

    expect(bottomChrome).toMatch(
      /@media\s*\(\s*height\s*<=\s*430px\s*\)\s*and\s*\(\s*orientation:\s*landscape\s*\)/,
    );
    expect(toolDock).toMatch(/@media\s*\(\s*width\s*<=\s*28rem\s*\)/);
  });
});
