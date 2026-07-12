export const FORCE_FULL = new Set([
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

export const FORCE_FULL_EXACT = new Set([
  "src/App.tsx",
  "src/components/motion/lazyMotion.ts",
  "src/routes/map-screen/lazyImports.ts",
]);

export const TEST_RELEVANT =
  /^src\/.*\.(ts|tsx)$|^functions\/|^vitest|^vite\.config|^tsconfig|^package(-lock)?\.json$/;

export function isForceFull(file) {
  return FORCE_FULL.has(file) || FORCE_FULL_EXACT.has(file);
}

export function filterTestRelevant(files) {
  return files.filter((file) => TEST_RELEVANT.test(file));
}

export function classifyTestRelevant(relevant) {
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

  return {
    testFiles,
    sourceFiles,
    runFunctions,
    forceFull: relevant.some((file) => isForceFull(file)),
  };
}
