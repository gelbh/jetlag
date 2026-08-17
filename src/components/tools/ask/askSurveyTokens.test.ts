/**
 * D4 gate: Ask HUD path must use Survey roles, not Broadcast surface-* tokens.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const FORBIDDEN =
  /(?:--|bg-|text-|border-|from-|to-|via-)?color-surface-(?:deep|panel|raised)\b|bg-surface-(?:deep|panel|raised|base)\b|text-surface-(?:deep|panel|raised|base)\b|(?<!ask-)hud-panel\b/;

const ASK_DIR = dirname(fileURLToPath(import.meta.url));
const ASK_HUD_CSS = join(ASK_DIR, "../../../styles/ask-hud.css");

function listAskSourceFiles(): string[] {
  return readdirSync(ASK_DIR)
    .filter(
      (name) =>
        /\.(tsx|ts|css)$/.test(name) &&
        !name.endsWith(".test.ts") &&
        !name.endsWith(".test.tsx"),
    )
    .map((name) => join(ASK_DIR, name));
}

describe("ask Survey token purge", () => {
  it("ask-hud.css has no Broadcast surface-* roles", () => {
    const css = readFileSync(ASK_HUD_CSS, "utf8");
    expect(css).not.toMatch(/surface-deep|surface-panel|surface-raised/);
    expect(css).toMatch(/--color-canvas/);
    expect(css).toMatch(/--color-field-ink/);
    expect(css).toMatch(/--color-flag/);
    expect(css).toMatch(/--color-rule/);
  });

  it("ask components do not use Broadcast hud-panel or surface-* Tailwind roles", () => {
    const offenders: string[] = [];
    for (const path of listAskSourceFiles()) {
      const source = readFileSync(path, "utf8");
      if (FORBIDDEN.test(source)) {
        offenders.push(path.replace(`${ASK_DIR}/`, ""));
      }
    }
    expect(offenders).toEqual([]);
  });
});
