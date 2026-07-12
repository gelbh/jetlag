import { execSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

const FORCE_FULL = new Set([
  "vitest.config.ts",
  "vitest.emulator.config.ts",
  "vite.config.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "src/test/setup.ts",
]);

const FORCE_FULL_EXACT = new Set([
  "src/App.tsx",
  "src/components/motion/lazyMotion.ts",
  "src/routes/map-screen/lazyImports.ts",
]);

const TEST_RELEVANT =
  /^src\/.*\.(ts|tsx)$|^functions\/|^vitest|^vite\.config|^tsconfig|^package(-lock)?\.json$/;

function isForceFull(file) {
  return FORCE_FULL.has(file) || FORCE_FULL_EXACT.has(file);
}

function getStagedFiles() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
  return out ? out.split("\n") : [];
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? projectRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const staged = getStagedFiles();

if (staged.length === 0) {
  process.exit(0);
}

const relevant = staged.filter((file) => TEST_RELEVANT.test(file));
if (relevant.length === 0) {
  process.exit(0);
}

const testFiles = [];
const sourceFiles = [];
let runFunctions = false;

for (const file of relevant) {
  if (file.startsWith("functions/")) {
    runFunctions = true;
    continue;
  }
  if (/\.test\.(ts|tsx)$/.test(file)) {
    testFiles.push(file);
  } else if (/^src\/.*\.(ts|tsx)$/.test(file)) {
    sourceFiles.push(file);
  }
}

if (relevant.some((file) => isForceFull(file))) {
  console.info(
    "test:staged — infra or lazy-entry file staged; running full vitest suite",
  );
  run("npx", ["vitest", "run"]);
} else {
  if (sourceFiles.length > 0) {
    console.info(
      `test:staged — vitest related (${sourceFiles.length} source file(s))`,
    );
    run("npx", [
      "vitest",
      "related",
      "--run",
      "--passWithNoTests",
      ...sourceFiles,
    ]);
  }

  if (testFiles.length > 0) {
    console.info(
      `test:staged — vitest run (${testFiles.length} test file(s))`,
    );
    run("npx", ["vitest", "run", ...testFiles]);
  }
}

if (runFunctions) {
  console.info("test:staged — functions/** staged; running functions tests");
  if (staged.includes("functions/package-lock.json")) {
    run("npm", ["ci"], { cwd: resolve(projectRoot, "functions") });
  }
  run("npm", ["test", "--prefix", "functions"]);
}
