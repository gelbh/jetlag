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
  return source.slice(openIndex);
}

const SHORT_PORTRAIT_MEDIA =
  /@media\s*\(\s*height\s*<=\s*700px\s*\)\s*and\s*\(\s*orientation:\s*portrait\s*\)/;

const DENSITY_GAP_TOKENS = [
  "--dock-float-gap",
  "--chrome-gap-above-dock",
  "--chrome-side-stack-lift",
] as const;

describe("short-portrait density CSS contract", () => {
  it("defines height<=700px portrait media that reassigns chrome density tokens", () => {
    const chromeCss = [
      readSource("src/styles/base.css"),
      readSource("src/styles/map-bottom-chrome.css"),
    ].join("\n");

    expect(chromeCss).toMatch(SHORT_PORTRAIT_MEDIA);

    const mediaMatch = SHORT_PORTRAIT_MEDIA.exec(chromeCss);
    expect(mediaMatch).not.toBeNull();
    const braceIndex = chromeCss.indexOf("{", mediaMatch!.index);
    expect(braceIndex).toBeGreaterThan(-1);
    const shortPortraitBlock = balancedBlock(chromeCss, braceIndex);

    expect(shortPortraitBlock).toMatch(/--status-bar-height\s*:/);
    expect(
      DENSITY_GAP_TOKENS.some((token) => new RegExp(`${token}\\s*:`).test(shortPortraitBlock)),
    ).toBe(true);
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
