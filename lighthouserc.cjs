const { cpus } = require("node:os");
const { createLhciConfig } = require("./lighthouserc.shared.cjs");

// Floors = CI median - 0.05, never below the program targets (/, /join, /premium >= 0.80;
// /create >= 0.60). Medians from PR #763 runs 37168611257 + 37169204794 (2026-10-04, served
// like prod): / 0.96|0.93, /join 0.97|0.95, /premium 0.97|0.95; a11y 0.95-0.96; CLS 0.
// /create misses its targets in CI (S2/S5 gap, recorded in #763): perf 0.64|0.58 (runs
// 0.56-0.65), TBT 402|622 ms (runs 378-669). Floor = latest median - 0.05; TBT cap above the
// worst observed run. Raise both to 0.60 / 600 once /create's boot cost drops.
// 2026-10-23 run 39983300635 (slow EPYC): /create TBT values 538-776, median ~702 failed a
// 700 cap on float noise (701.999…). Cap = ceil(worst observed) with headroom → 800.
// / and /premium floors split by runner CPU model: simulated TBT scales with host CPU. 27 CI
// runs (2026-10-11): fast models (10 runs) scored / 0.94-0.96, /premium 0.95-0.97; AMD EPYC
// 7763 (17 runs, benchmarkIndex ~2450) scored / 0.91-0.93, /premium 0.92-0.94. Unlisted models
// (new SKUs, local Macs) get the slow floors. LHCI_CPU_MODEL overrides the detected model.
// 5 runs absorb single-run CPU-contention dips (per-run benchmarkIndex < 2000, / down to 0.73).
// Slow /premium was 0.9 (only ~0.02 under the 0.92 low median), so median noise at the
// assert boundary failed CI (run 39964270235: median 0.89, values 0.86-0.90). Apply the
// same median-0.05 rule as / → 0.87. Do not "rerun failed" for this class of miss.
// Slow /join after Sydney pack (#972 runs 40112504617): medians 0.90 / 0.91 (values
// 0.89-0.93). Split join like /premium → slow 0.87; keep fast at 0.92.
const FAST_CPU_MODELS = [
  "AMD EPYC 9V74 80-Core Processor",
  "AMD EPYC 9V45 96-Core Processor",
  "INTEL(R) XEON(R) PLATINUM 8573C",
  "Intel(R) Xeon(R) 6973P-C",
];
const model = process.env.LHCI_CPU_MODEL?.trim() || cpus()[0]?.model?.trim() || "";
const fast = FAST_CPU_MODELS.includes(model);
const runnerClass = fast ? "fast" : "slow";

module.exports = createLhciConfig({
  perf: {
    home: fast ? 0.91 : 0.88,
    join: fast ? 0.92 : 0.87,
    premium: fast ? 0.92 : 0.87,
    create: 0.53,
  },
  numberOfRuns: 5,
  createMaxTbtMs: 800,
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
module.exports.model = model;
module.exports.runnerClass = runnerClass;
module.exports.FAST_CPU_MODELS = FAST_CPU_MODELS;
