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

/** Lines that only assert the banned marker is absent (residual scrub). */
const ABSENCE_ASSERT =
  /toHaveCount\(\s*0\s*\)|not\.toBeAttached|not\.toBeVisible/;

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

function lineMentionsNeedleWithoutAbsenceAssert(
  text: string,
  needle: string,
): boolean {
  for (const line of text.split("\n")) {
    if (!line.includes(needle)) {
      continue;
    }
    if (ABSENCE_ASSERT.test(line)) {
      continue;
    }
    return true;
  }
  return false;
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
        if (lineMentionsNeedleWithoutAbsenceAssert(text, needle)) {
          hits.push(`${relative(ROOT, file)}: ${needle}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
