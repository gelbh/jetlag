#!/usr/bin/env node
/**
 * Geometry WASM parity + perf gates.
 * Invoked by `just geometry-gates` (or `node scripts/dev/geometry-gates.mjs`).
 */
import { run } from "../lib/run-command.mjs";

const parityTests = [
  "src/domain/geometry/kernel/geodesicWasmParity.test.ts",
  "src/domain/geometry/kernel/dispatchKernel.test.ts",
  "src/domain/geometry/kernel/extrasWasmDispatch.test.ts",
  "src/domain/geometry/kernel/maskWasmParity.test.ts",
  "src/domain/geometry/kernel/halfPlaneWasmParity.test.ts",
  "src/domain/geometry/kernel/nearRegionWasmParity.test.ts",
  "src/domain/geometry/kernel/tentacleWasmParity.test.ts",
  "src/domain/geometry/kernel/voronoiWasmParity.test.ts",
  "src/domain/geometry/kernel/spatialVoronoiOutcomeParity.test.ts",
  "src/domain/geometry/kernel/unionWasmParity.test.ts",
];

run("npm", ["run", "wasm:build"]);
run("vitest", ["run", ...parityTests]);
run("npm", ["run", "test:perf"]);
