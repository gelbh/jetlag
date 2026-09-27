import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");
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
});
