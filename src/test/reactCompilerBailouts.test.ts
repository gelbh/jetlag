import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { transform } from "oxc-transform-react";
import { describe, expect, it } from "vitest";

// Files React Compiler skips in production builds. Keep this empty: fix the bailout, or opt
// out with "use no memo" and a reason.
// Sweep plan: .superpowers/plans/2026-10-11-react-compiler-bailout-sweep.md
const KNOWN_BAILOUTS = new Set<string>();

const repoRoot = join(import.meta.dirname, "../..");
const srcDir = join(repoRoot, "src");

function sourceFiles(): string[] {
  return readdirSync(srcDir, { recursive: true, encoding: "utf8" })
    .filter((path) => /\.tsx?$/.test(path) && !/\.(test|d)\.tsx?$/.test(path))
    .filter((path) => !path.startsWith("test/"))
    .map((path) => `src/${path.split("\\").join("/")}`)
    .sort();
}

async function compilerErrors(path: string): Promise<string[]> {
  const code = readFileSync(join(repoRoot, path), "utf8");
  const result = await transform(path, code, {
    jsx: { runtime: "automatic" },
    reactCompiler: { panicThreshold: "all_errors" },
    sourcemap: false,
  });
  return result.errors.map((error) => error.message.split("\n")[0] ?? "");
}

describe("React Compiler coverage", () => {
  it("no source file bails out of React Compiler", { timeout: 60_000 }, async () => {
    const newBailouts: string[] = [];
    const nowCompiling: string[] = [];
    for (const path of sourceFiles()) {
      const errors = await compilerErrors(path);
      if (errors.length > 0 && !KNOWN_BAILOUTS.has(path)) {
        newBailouts.push(`${path}: ${errors.join("; ")}`);
      } else if (errors.length === 0 && KNOWN_BAILOUTS.has(path)) {
        nowCompiling.push(path);
      }
    }
    expect({ newBailouts, nowCompiling }).toEqual({ newBailouts: [], nowCompiling: [] });
  });
});
