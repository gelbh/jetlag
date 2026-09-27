import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");
const COMPONENTS_ROOT = join(ROOT, "src/components");
const BANNED = ["data-player-ux-world", "map-survey-chrome"] as const;
const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "pkg",
  "ios",
  "android",
  ".wrangler",
]);

/** MFA float inventory scopes: Survey `hud-panel` must be gone here. */
const MFA_HUD_PANEL_SCOPES = [
  "session/banners",
  "session/status",
  "ui/banners",
  "incident",
] as const;

/**
 * Non-inventory holdouts still using `hud-panel` inside MFA scopes.
 * Do not migrate these in MFA-C (TimerBlock dropdown, etc.).
 */
const HUD_PANEL_ALLOWLIST = new Set([
  "src/components/session/status/TimerBlock.tsx",
]);

function collectFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) {
      continue;
    }
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      // Broken symlink / unreadable (e.g. local .env) — skip.
      continue;
    }
    if (st.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    if (/\.(tsx?|jsx?|mjs|cjs|css|md|yml|yaml|json|html|txt)$/i.test(entry)) {
      out.push(full);
    }
  }
}

function isProductionSource(file: string): boolean {
  return (
    /\.(tsx?|jsx?)$/.test(file) &&
    !/\.test\.(tsx?|jsx?)$/.test(file) &&
    !file.endsWith("playerUxWorldBan.test.ts")
  );
}

describe("Verify #5 player UX world purge", () => {
  it("bans data-player-ux-world and map-survey-chrome across the tree", () => {
    const files: string[] = [];
    collectFiles(ROOT, files);
    const hits: string[] = [];
    for (const file of files) {
      // This test file names the ban strings on purpose.
      if (file.endsWith("playerUxWorldBan.test.ts")) {
        continue;
      }
      const text = readFileSync(file, "utf8");
      for (const needle of BANNED) {
        if (text.includes(needle)) {
          hits.push(`${relative(ROOT, file)}: ${needle}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("bans map-float-alert under src/components production sources", () => {
    const files: string[] = [];
    collectFiles(COMPONENTS_ROOT, files);
    const hits: string[] = [];
    for (const file of files) {
      if (!isProductionSource(file)) {
        continue;
      }
      const text = readFileSync(file, "utf8");
      if (text.includes("map-float-alert")) {
        hits.push(relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it("bans hud-panel on MFA float inventory scopes (allowlisted holdouts only)", () => {
    const hits: string[] = [];
    for (const scope of MFA_HUD_PANEL_SCOPES) {
      const scopeRoot = join(COMPONENTS_ROOT, scope);
      const files: string[] = [];
      collectFiles(scopeRoot, files);
      for (const file of files) {
        if (!isProductionSource(file)) {
          continue;
        }
        const rel = relative(ROOT, file);
        if (HUD_PANEL_ALLOWLIST.has(rel)) {
          continue;
        }
        const text = readFileSync(file, "utf8");
        if (text.includes("hud-panel")) {
          hits.push(rel);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
