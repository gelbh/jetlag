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

/** Expect chains that prove the banned marker is gone from the DOM. */
const ABSENCE_EXPECT =
  /expect\(([\s\S]*?)\)\s*\.\s*(?:toHaveCount\(\s*0\s*,?\s*\)|not\.toBeAttached)/g;

/** How many following lines may still carry the absence assert after a wrap. */
const ABSENCE_LOOKAHEAD_LINES = 3;

function windowHasAbsenceAssertForNeedle(
  window: string,
  needle: string,
): boolean {
  for (const match of window.matchAll(ABSENCE_EXPECT)) {
    if (match[1]?.includes(needle)) {
      return true;
    }
  }
  return false;
}

export function mentionsNeedleWithoutAbsenceAssert(
  text: string,
  needle: string,
): boolean {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]!.includes(needle)) {
      continue;
    }
    const window = lines.slice(i, i + ABSENCE_LOOKAHEAD_LINES + 1).join("\n");
    if (windowHasAbsenceAssertForNeedle(window, needle)) {
      continue;
    }
    return true;
  }
  return false;
}

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

describe("mentionsNeedleWithoutAbsenceAssert", () => {
  it("allows same-line absence asserts", () => {
    expect(
      mentionsNeedleWithoutAbsenceAssert(
        'await expect(page.locator("[data-player-ux-world]")).toHaveCount(0);',
        "data-player-ux-world",
      ),
    ).toBe(false);
  });

  it("allows prettier-wrapped absence asserts within lookahead", () => {
    const wrapped = `await expect(page.locator("[data-player-ux-world]")).toHaveCount(
  0,
);`;
    expect(
      mentionsNeedleWithoutAbsenceAssert(wrapped, "data-player-ux-world"),
    ).toBe(false);
  });

  it("flags product uses without an absence assert nearby", () => {
    expect(
      mentionsNeedleWithoutAbsenceAssert(
        'el.setAttribute("data-player-ux-world", "1");',
        "data-player-ux-world",
      ),
    ).toBe(true);
  });

  it("does not treat not.toBeVisible as absence", () => {
    expect(
      mentionsNeedleWithoutAbsenceAssert(
        'await expect(page.locator("[data-player-ux-world]")).not.toBeVisible();',
        "data-player-ux-world",
      ),
    ).toBe(true);
  });

  it("does not exempt a banned marker via an unrelated nearby absence assert", () => {
    const unrelated = `el.setAttribute("data-player-ux-world", "1");
await expect(page.getByRole("button", { name: "Send" })).toHaveCount(0);`;
    expect(
      mentionsNeedleWithoutAbsenceAssert(unrelated, "data-player-ux-world"),
    ).toBe(true);
  });
});

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
        if (mentionsNeedleWithoutAbsenceAssert(text, needle)) {
          hits.push(`${relative(ROOT, file)}: ${needle}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
