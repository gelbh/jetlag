const { cpus } = require("node:os");
const { createLhciConfig } = require("./lighthouserc.shared.cjs");

// Floors = CI median - 0.05, never below the program targets (/, /join, /premium >= 0.80;
// /create >= 0.60). Medians from PR #763 runs 37168611257 + 37169204794 (2026-10-04, served
// like prod): / 0.96|0.93, /join 0.97|0.95, /premium 0.97|0.95; a11y 0.95-0.96; CLS 0.
// /create misses its targets in CI (S2/S5 gap, recorded in #763): perf 0.64|0.58 (runs
// 0.56-0.65), TBT 402|622 ms (runs 378-669). Floor = latest median - 0.05; TBT cap above the
// worst observed run. Raise both to 0.60 / 600 once /create's boot cost drops.
// / and /premium floors split by runner CPU model: simulated TBT scales with host CPU. 27 CI
// runs (2026-10-11): fast models (10 runs) scored / 0.94-0.96, /premium 0.95-0.97; AMD EPYC
// 7763 (17 runs, benchmarkIndex ~2450) scored / 0.91-0.93, /premium 0.92-0.94. Unlisted models
// (new SKUs, local Macs) get the slow floors. LHCI_CPU_MODEL overrides the detected model.
// 5 runs absorb single-run CPU-contention dips (per-run benchmarkIndex < 2000, / down to 0.73).
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
  perf: { home: fast ? 0.91 : 0.88, join: 0.92, premium: fast ? 0.92 : 0.9, create: 0.53 },
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
module.exports.model = model;
module.exports.runnerClass = runnerClass;
module.exports.FAST_CPU_MODELS = FAST_CPU_MODELS;
