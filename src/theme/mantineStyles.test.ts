import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
// `require.resolve("@mantine/core")` → <pkg>/cjs/index.cjs
const coreRoot = resolve(dirname(require.resolve("@mantine/core")), "..");
const notificationsRoot = resolve(dirname(require.resolve("@mantine/notifications")), "..");
const componentsDir = join(coreRoot, "esm/components");
const utilsDir = join(coreRoot, "esm/utils");
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
    typeOnly
      ? []
      : body
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
    const dir = [join(componentsDir, name), join(utilsDir, name)].find(existsSync);
    if (!dir) continue; // hooks, providers
    seen.add(name);
    for (const file of walkFiles(dir, /\.mjs$/)) {
      const source = readFileSync(file, "utf8");
      const deps = /(?:from|import)\s+["']\.\.\/(?:\.\.\/(?:utils|components)\/)?([A-Za-z]+)\//g;
      for (const [, dep] of source.matchAll(deps)) {
        queue.push(dep);
      }
    }
  }
  return seen;
}

function listedCssImports(file: string): string[] {
  const source = readFileSync(resolve(__dirname, file), "utf8");
  return [...source.matchAll(/import\s+["']@mantine\/core\/styles\/([A-Za-z]+)\.layer\.css["']/g)]
    .map(([, name]) => name)
    .filter((name) => /^[A-Z]/.test(name)); // skip baseline / global / variables
}

/** Sources that only render under an admin root, which imports `mantineAdminStyles`. */
const isAdminSource = (path: string) =>
  /[\\/]src[\\/](components[\\/]admin[\\/]|routes[\\/]admin-map-screen[\\/]|routes[\\/]AdminMapScreen\.tsx$|theme[\\/]adminTheme\.ts$)/.test(
    path,
  );

/** Styled Mantine components (with internal deps) that the given sources render. */
function styledComponents(sources: string[]): string[] {
  const used = new Set(sources.flatMap((f) => mantineCoreImports(readFileSync(f, "utf8"))));
  return [...withInternalDeps(used)].filter((n) => existsSync(cssFor(n)));
}

describe("Mantine per-component CSS", () => {
  const shell = listedCssImports("mantineShellStyles.ts");
  const admin = listedCssImports("mantineAdminStyles.ts");
  const listed = new Set([...shell, ...admin]);
  const appSources = walkFiles(srcDir, /\.tsx?$/).filter((f) => !/\.test\.tsx?$/.test(f));

  it("covers every styled Mantine component the app renders", () => {
    const notificationSources = walkFiles(join(notificationsRoot, "esm"), /\.mjs$/);
    const styled = styledComponents([...appSources, ...notificationSources]);
    expect(styled.filter((n) => !listed.has(n)).sort()).toEqual([]);
  });

  it("keeps admin-only CSS out of player code", () => {
    const playerStyled = new Set(styledComponents(appSources.filter((f) => !isAdminSource(f))));
    expect(admin.filter((n) => playerStyled.has(n))).toEqual([]);
  });

  it("loads admin-only CSS from every admin root", () => {
    for (const root of ["components/admin/shared/AdminWorld.tsx", "routes/AdminMapScreen.tsx"]) {
      expect(readFileSync(join(srcDir, root), "utf8")).toMatch(/theme\/mantineAdminStyles"/);
    }
  });

  it("follows Mantine internal deps (guards the dep walk itself)", () => {
    expect(withInternalDeps(["Button"])).toContain("UnstyledButton");
    expect(withInternalDeps(["Drawer"])).toContain("ModalBase");
    expect(withInternalDeps(["Checkbox"])).toContain("InlineInput");
  });

  it("imports only existing, non-duplicated layer CSS files", () => {
    const imports = [...shell, ...admin];
    expect(imports.filter((n) => !existsSync(cssFor(n)))).toEqual([]);
    expect(new Set(imports).size).toBe(imports.length);
  });
});
