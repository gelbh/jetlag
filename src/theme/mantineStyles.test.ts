import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
// `require.resolve("@mantine/core")` → <pkg>/cjs/index.cjs
const coreRoot = resolve(dirname(require.resolve("@mantine/core")), "..");
const notificationsRoot = resolve(
  dirname(require.resolve("@mantine/notifications")),
  "..",
);
const componentsDir = join(coreRoot, "esm/components");
const cssFor = (name: string) => join(coreRoot, "styles", `${name}.layer.css`);
const srcDir = resolve(__dirname, "..");

function walkFiles(dir: string, match: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(path, match);
    return match.test(entry.name) ? [path] : [];
  });
}

/** Named imports from "@mantine/core" (multiline-safe; drops `type` / `as`). */
function mantineCoreImports(source: string): string[] {
  const re = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']@mantine\/core["']/g;
  return [...source.matchAll(re)].flatMap(([, typeOnly, body]) =>
    typeOnly ? [] : body
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("type "))
      .map((s) => s.split(/\s+as\s+/)[0].trim()),
  );
}

/** Component plus the sibling component dirs it imports, recursively. */
function withInternalDeps(roots: Iterable<string>): Set<string> {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length) {
    const name = queue.pop()!;
    if (seen.has(name)) continue;
    const dir = join(componentsDir, name);
    if (!existsSync(dir)) continue; // hooks, utils, providers
    seen.add(name);
    for (const file of walkFiles(dir, /\.mjs$/)) {
      const source = readFileSync(file, "utf8");
      for (const [, dep] of source.matchAll(/(?:from|import)\s+["']\.\.\/([A-Za-z]+)\//g)) {
        queue.push(dep);
      }
    }
  }
  return seen;
}

function listedCssImports(file: string): string[] {
  const source = readFileSync(resolve(__dirname, file), "utf8");
  return [
    ...source.matchAll(/import\s+["']@mantine\/core\/styles\/([A-Za-z]+)\.layer\.css["']/g),
  ]
    .map(([, name]) => name)
    .filter((name) => /^[A-Z]/.test(name)); // skip baseline / global / variables
}

describe("Mantine per-component CSS", () => {
  const listed = new Set(listedCssImports("mantineShellStyles.ts"));

  it("covers every styled Mantine component the app renders", () => {
    const appSources = walkFiles(srcDir, /\.tsx?$/).filter(
      (f) => !/\.test\.tsx?$/.test(f),
    );
    const notificationSources = walkFiles(join(notificationsRoot, "esm"), /\.mjs$/);
    const used = new Set(
      [...appSources, ...notificationSources].flatMap((f) =>
        mantineCoreImports(readFileSync(f, "utf8")),
      ),
    );
    const styled = [...withInternalDeps(used)].filter((n) => existsSync(cssFor(n)));
    expect(styled.filter((n) => !listed.has(n)).sort()).toEqual([]);
  });

  it("imports only existing, non-duplicated layer CSS files", () => {
    const imports = listedCssImports("mantineShellStyles.ts");
    expect(imports.filter((n) => !existsSync(cssFor(n)))).toEqual([]);
    expect(new Set(imports).size).toBe(imports.length);
  });
});
