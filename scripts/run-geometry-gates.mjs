#!/usr/bin/env node
/**
 * Geometry WASM parity + perf gates.
 * Invoked by `npm run test:geometry-gates`.
 */
import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "node_modules", ".bin");
const env = {
  ...process.env,
  PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
};

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  // status is null when the child exits via signal — treat as failure
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const parityTests = [
  "src/domain/geometry/kernel/dualGoldenParity.test.ts",
  "src/domain/geometry/kernel/geodesicWasmParity.test.ts",
  "src/domain/geometry/kernel/dispatchKernel.test.ts",
  "src/domain/geometry/kernel/extrasWasmDispatch.test.ts",
  "src/domain/geometry/kernel/maskWasmParity.test.ts",
  "src/domain/geometry/kernel/halfPlaneWasmParity.test.ts",
  "src/domain/geometry/kernel/nearRegionWasmParity.test.ts",
];

run("npm", ["run", "wasm:build"]);
run("vitest", ["run", ...parityTests]);
run("npm", ["run", "test:perf"]);
