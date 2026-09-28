import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");
const SRC = join(ROOT, "src");
const BANNED = ["banners/AnimatedOverlay", "motion/MotionSheet"] as const;
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

function collectFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) {
      continue;
    }
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, out);
      continue;
    }
    if (/\.(tsx?|jsx?|mjs|cjs|css|md|yml|yaml|json|html|txt)$/i.test(entry)) {
      out.push(full);
    }
  }
}

describe("legacy MotionSheet purge", () => {
  it("bans AnimatedOverlay and MotionSheet import paths under src/", () => {
    const files: string[] = [];
    collectFiles(SRC, files);
    const hits: string[] = [];
    for (const file of files) {
      if (file.endsWith("legacyMotionSheetBan.test.ts")) {
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
});
