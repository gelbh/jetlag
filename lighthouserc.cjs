const { createLhciConfig } = require("./lighthouserc.shared.cjs");

// Floors = CI median - 0.05, never below the program targets (/, /join, /premium >= 0.80;
// /create >= 0.60). Medians from PR #763 runs 37168611257 + 37169204794 (2026-10-04, served
// like prod): / 0.96|0.93, /join 0.97|0.95, /premium 0.97|0.95; a11y 0.95-0.96; CLS 0.
// /create misses its targets in CI (S2/S5 gap, recorded in #763): perf 0.64|0.58 (runs
// 0.56-0.65), TBT 402|622 ms (runs 378-669). Floor = latest median - 0.05; TBT cap above the
// worst observed run. Raise both to 0.60 / 600 once /create's boot cost drops.
// / and /premium lowered (0.91 -> 0.88, 0.92 -> 0.90): the floors above came from fast runners.
// ubuntu-24.04 runners split by Lighthouse benchmarkIndex: ~2300-2600 (slow) vs ~2850-4300
// (fast). Simulated TBT scales with host CPU, so slow runners score / 0.90-0.94 (median 0.92)
// and /premium 0.90-0.94 vs 0.95-0.97 on fast ones. 39 PR runs (2026-10-07..11): 4 of 19
// slow-runner runs missed the old floors, 0 of their medians fell below the new ones.
// 5 runs absorb single-run CPU-contention dips (per-run benchmarkIndex < 2000, / down to 0.73).
module.exports = createLhciConfig({
  perf: { home: 0.88, join: 0.92, premium: 0.9, create: 0.53 },
  numberOfRuns: 5,
  createMaxTbtMs: 700,
  outputDir: ".lighthouseci/mobile",
  collectSettings: {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
  },
});
